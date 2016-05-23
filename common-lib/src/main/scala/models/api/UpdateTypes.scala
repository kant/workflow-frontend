package models.api
import models.ContentItem
import play.api.libs.json._


case class ContentUpdate(stubId: Long, composerId: Option[String])
case class DeleteOp(stubId: Long, composerRows: Int)
object ContentUpdate { implicit val jsonFormats = Json.format[ContentUpdate] }
object DeleteOp {  implicit val jsonFormats = Json.format[DeleteOp] }

sealed trait ContentUpdateError

case class DatabaseError(message: String) extends ContentUpdateError
object DatabaseError { implicit val jsonFormats = Json.format[DatabaseError] }
case object ContentItemExists extends ContentUpdateError
case class StubNotFound(id: Long) extends ContentUpdateError
object StubNotFound { implicit val jsonFormats = Json.format[StubNotFound] }
case class ComposerIdsConflict(stubComposerId: Option[String], wcComposerId: Option[String]) extends ContentUpdateError
object ComposerIdsConflict { implicit val jsonFormats = Json.format[ComposerIdsConflict]}