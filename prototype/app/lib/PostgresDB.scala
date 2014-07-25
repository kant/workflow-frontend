package lib

import models.Flag.Flag
import models._
import com.github.tototoshi.slick.PostgresJodaSupport._
import org.joda.time.DateTime
import scala.slick.driver.PostgresDriver.simple._
import com.gu.workflow.db.Schema._
import com.gu.workflow.syntax._
import com.gu.workflow.db.CommonDB._

object PostgresDB {

  import play.api.Play.current
  import play.api.db.slick.DB

  val flagsToStubFilters = Map(
    "needsLegal" -> {q: StubQuery => q.filter(_.needsLegal === Flag.Required)}
  )

  def getContent(
                  section:     Option[Section]  = None,
                  dueFrom:     Option[DateTime] = None,
                  dueUntil:    Option[DateTime] = None,
                  status:      Option[Status]   = None,
                  contentType: Option[String]   = None,
                  published:   Option[Boolean]  = None,
                  flags:       Seq[String]      = Nil
                  ): List[DashboardRow] =
    DB.withTransaction { implicit session =>


      val stubsQuery =
          flags.foldLeft(stubs){ case(q, flag) =>
            flagsToStubFilters.get(flag).map{ filter => filter(q)}.getOrElse(q)
          } |>
          dueFrom.foldl[StubQuery]  ((q, dueFrom)  => q.filter(_.due >= dueFrom)) |>
          dueUntil.foldl[StubQuery] ((q, dueUntil) => q.filter(_.due < dueUntil)) |>
          section.foldl[StubQuery]  { case (q, Section(s))  => q.filter(_.section === s) }

      val contentQuery =
        content |>
          status.foldl[ContentQuery] { case (q, Status(s)) => q.filter(_.status === s) } |>
          contentType.foldl[ContentQuery] ((q, contentType) => q.filter(_.contentType === contentType)) |>
          published.foldl[ContentQuery] ((q, published) => q.filter(_.published === published))

      val query = for {
        s <- stubsQuery
        c <- contentQuery if s.composerId === c.composerId
      } yield (s, c)
      
      query.filter( {case (s, c) => dueDateNotExpired(s.due) })
           .sortBy { case (s, c) => (s.priority.desc, s.due.desc) }.list.map {
            case ((pk, title, section, due, assignee, cId, stubContentType, priority, needsLegal, note) ,
            (composerId, path, lastMod, lastModBy, status, contentType, commentable, headline, published, timePublished, _)) =>
              DashboardRow(
                Stub(Some(pk), title, section, due, assignee, cId, stubContentType, priority, needsLegal, note),
                WorkflowContent(
                  composerId,
                  path,
                  headline,
                  contentType,
                  Some(Section(section)),
                  Status(status),
                  lastMod,
                  lastModBy,
                  commentable,
                  published
                )
              )
      }

    }

  private def ensureContentExistsWithId(composerId: String, contentType: String)(implicit session: Session) {
    val contentExists = content.filter(_.composerId === composerId).exists.run
    if(!contentExists) {
      content +=
        ((composerId, None, new DateTime, None, Status.Writers.name, contentType, false, None, false, None, None))
    }
  }

  def createStub(stub: Stub): Unit =
    DB.withTransaction { implicit session =>
      stub.composerId.foreach(ensureContentExistsWithId(_, stub.contentType.getOrElse("article")))
      stubs += ((0, stub.title, stub.section, stub.due, stub.assignee, stub.composerId, stub.contentType, stub.priority, Flag.NotRequired, stub.note))
    }


  def updateStub(id: Long, stub: Stub) {
    DB.withTransaction { implicit session =>

      stub.composerId.foreach(ensureContentExistsWithId(_, stub.contentType.getOrElse("article")))

      stubs
        .filter(_.pk === id)
        .map(s => (s.workingTitle, s.section, s.due, s.assignee, s.composerId, s.contentType, s.priority))
        .update((stub.title, stub.section, stub.due, stub.assignee, stub.composerId, stub.contentType, stub.priority))
    }
  }

  def updateStubWithComposerId(id: Long, composerId: String, contentType: String): Int = {
    DB.withTransaction { implicit session =>

      ensureContentExistsWithId(composerId, contentType)

      stubs
        .filter(_.pk === id)
        .map(s => (s.composerId, s.contentType))
        .update((Some(composerId), Some(contentType)))
    }
  }

  def updateStubWithAssignee(id: Long, assignee: Option[String]): Int = {
    DB.withTransaction { implicit session =>
      stubs
        .filter(_.pk === id)
        .map(s => s.assignee)
        .update(assignee)
    }
  }

  def updateStubDueDate(id: Long, dueDate: Option[DateTime]): Int = {
    DB.withTransaction { implicit session =>
      stubs
        .filter(_.pk === id)
        .map(s => s.due)
        .update(dueDate)
    }
  }

  def updateStubNote(id: Long, note: Option[String]): Int = {
    DB.withTransaction { implicit session =>
      stubs
        .filter(_.pk === id)
        .map(s => s.note)
        .update(note)
    }
  }

  def updateStubLegalStatus(id: Long, status: Flag): Int = {
    DB.withTransaction { implicit session =>
      stubs
        .filter(_.pk === id)
        .map(s => s.needsLegal)
        .update(status)
    }
  }

  def stubLinkedToComposer(id: Long): Boolean = {
    DB.withTransaction { implicit session =>
      val q = stubs.filter(stub => stub.pk === id && stub.composerId.isNotNull)
      q.length.run > 0
    }
  }

  def deleteStub(id: Long) {
    DB.withTransaction { implicit session =>
      stubs.filter(_.pk === id).delete
    }
  }

  def updateContentStatus(status: String, composerId: String): Int = {
    DB.withTransaction { implicit session =>
      val q = for {
        wc <- content if wc.composerId === composerId
      } yield wc.status
      q.update(status)
    }
  }
}