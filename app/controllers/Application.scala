package controllers

import com.gu.workflow.db.SectionDB
import com.gu.workflow.db.DeskDB

import scala.concurrent.ExecutionContext.Implicits.global

import lib._
import lib.Composer._

import play.api.mvc._
import play.api.libs.json.Json


object Application extends Controller with PanDomainAuthActions {

  def index = app("Dashboard")

  def app(title: String) = AuthAction.async { request =>

    for {
      statuses <- StatusDatabase.statuses
      sections = SectionDB.sectionList.sortBy(_.name)
      desks = DeskDB.deskList.sortBy(_.name)
      sectionsInDesks = DeskDB.getSectionsInDesks
    }
    yield {
      val user = request.user

      val config = Json.obj(
        "composer" -> Json.obj(
          "create" -> newContentUrl,
          "view" -> adminUrl,
          "details" -> contentDetails
        ),
        "statuses" -> statuses,
        "desks"    -> desks,
        "sections" -> sections,
        "sectionsInDesks" -> sectionsInDesks,
        "presenceUrl" -> PrototypeConfiguration.cached.presenceUrl,
        "user" -> Json.parse(user.toJson)
      )

      Ok(views.html.app(title, Some(user), config))
    }
  }
}
