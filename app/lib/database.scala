package lib

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import models.{Status, Stub, Section, WorkflowContent}
import akka.agent.Agent
import play.api.libs.ws._
import java.util.UUID
import play.api.libs.json.JsArray
import play.api.mvc.Action
import scala.util.Try


object ContentDatabase {

  type Store = Map[UUID, WorkflowContent]

  val store: Agent[Store] = Agent(Map.empty)

  def update(contentId: UUID, f: WorkflowContent => WorkflowContent): Future[Option[WorkflowContent]] = {
    val updatedStore = store.alter { items =>
      val updatedItem = items.get(contentId).map(f)
      updatedItem.map(items.updated(contentId, _)).getOrElse(items)
    }
    updatedStore.map(_.get(contentId))
  }

  def createOrModify(composerId: String, create: => WorkflowContent, modify: WorkflowContent => WorkflowContent): Future[Unit] =
    for {
      updatedStore <- store.alter { items =>
        items.find { case (key, content) => content.composerId == composerId } match {
          case Some((key, existing)) =>
            items.updated(key, modify(existing))
          case None =>
            val newItem = create
            items.updated(newItem.id, newItem)
        }
      }
    }
    yield ()
}

object SectionDatabase {
  val store: Agent[Set[Section]] = Agent(Set())

  for(apiSections <- loadSectionsFromApi) store.alter(apiSections)

  def upsert(section: Section): Future[Set[Section]] = store.alter(_ + section)
  def remove(section: Section): Future[Set[Section]] = store.alter(_ - section)

  def sectionList: Future[List[Section]] = Future { store.get().toList.sortBy(_.name) }

  // TODO sw 02/05/2014 this a dev bootstrap, remove in favor of persisted list once we've got a persistence mechanism
  private def loadSectionsFromApi = {
    val sectionUrl = "http://content.guardianapis.com/sections.json"
    WS.url(sectionUrl).get().map { resp =>
      val titles = resp.json \ "response" \ "results" match {
        case JsArray(sections) => sections.map{ s => (s \ "webTitle").as[String] }
        case _ => Nil
      }
      titles.map(Section(_)).toSet
    }

  }

}

object StatusDatabase {

  val store: Agent[List[Status]] = Agent(List(
    Status("Stub"),
    Status("Writers"),
    Status("Desk"),
    Status("Subs"),
    Status("Revise"),
    Status("Final")
  ))

  def statuses = store.future()

  def find(name: String) = store.get().find(_.name == name)

  def get(name: String) = find(name).get

  def remove(status: Status): Future[List[Status]] = store.alter(_.filterNot(_ == status))

  def add(status: Status): Future[List[Status]] = store.alter(_ :+ status)

  def moveUp(status: Status): Future[List[Status]] = store.alter(moveUp(status, _))

  def moveDown(status: Status): Future[List[Status]] = store.alter(moveDown(status, _))

  private def moveUp(s: Status, ss: List[Status]): List[Status] = {
    val index = ss.indexOf(s)
    if (index > 0) {
      ss.patch(index - 1, List(s, ss(index - 1)), 2)
    } else {
      ss
    }
  }

  private def moveDown(s: Status, ss: List[Status]): List[Status] = {
    val index = ss.indexOf(s)
    if (index + 1 < ss.length && index > -1) {
      ss.patch(index, List(ss(index + 1), s), 2)
    } else {
      ss
    }
  }
}

object StubDatabase {

  import play.api.libs.json.Json

  def getAll: Future[List[Stub]] =
    AWSWorkflowBucket.readStubsFile.map(parseStubsJson)

  def create(stub: Stub): Future[Unit] =
    for {
      stubs <- getAll
      newStubs = stub :: stubs
      _ <- writeAll(newStubs)
    } yield ()

  def upsert(stub: Stub): Future[Unit] =
    for {
      stubs <- getAll
      rest = stubs.filterNot(_.id == stub.id)
      _ <- writeAll(stub :: rest)
    } yield ()

  private def writeAll(stubs: List[Stub]): Future[Unit] =
    for {
      _ <- AWSWorkflowBucket.putJson(Json.toJson(stubs))
    } yield ()

  private def parseStubsJson(s: String): List[Stub] = {
    Try(Json.parse(s)).toOption
      .flatMap(_.validate[List[Stub]].asOpt)
      .getOrElse(Nil)
  }

  def update(stubId: String, composerId: String): Future[Unit] = for {
      stubs <- getAll
      updatedStubs = stubs.map( s => if(s.id==stubId) s.copy(composerId=Some(composerId)) else s)
      json = Json.toJson(updatedStubs)
      _ <- AWSWorkflowBucket.putJson(json)
  } yield ()
}
