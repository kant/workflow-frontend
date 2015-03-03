package controllers

import models._
import play.api.mvc._
import Response.Response

object PlanApi extends Controller with PanDomainAuthActions with WorkflowApi {
  def plan() = APIAuthAction { request =>
    Ok("hi")
  }
}
