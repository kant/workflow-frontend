package lib

import lib.Response._
import play.api.libs.json.Json

case class ContentUpdate(stubId: Long, composerId: Option[String])

object ContentUpdate {
  implicit val jsonFormats = Json.format[ContentUpdate]

}

object DBToAPIResponse {

  def updateStubRes(id: Long, updatedRow: Int): Response[Long] = {
    if(updatedRow==0) Left(ApiErrors.updateError(id))
    else Right(ApiSuccess(id))
  }

  def updateWorkflowRes(id: String, updatedRow: Int): Response[String] = {
    if(updatedRow==0) Left(ApiErrors.composerIdNotFound(id))
    else Right(ApiSuccess(id))
  }

  def createContentResponse(id: Option[ContentUpdate]): Response[ContentUpdate] = {
    id match {
      case Some(i) => Right(ApiSuccess(i))
      case None => Left(ApiErrors.conflict)
    }
  }

}