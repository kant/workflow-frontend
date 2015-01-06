package models

import org.joda.time.DateTime
import play.api.libs.json._
import play.api.libs.functional.syntax._

sealed trait WorkflowNotification

case class ContentUpdateEvent (
  composerId: String,
  identifiers: Map[String, String],
  fields: Map[String, String],
  mainBlock: Option[Block],
  `type`: String,
  whatChanged: String,
  published: Boolean,
  user: Option[String],
  lastModified: DateTime,
  tags: Option[List[Tag]],
  status: Status,
  commentable: Boolean,
  lastMajorRevisionDate: Option[DateTime],
  publicationDate: Option[DateTime],
  thumbnail: Option[Thumbnail],
  storyBundleId: Option[String],
  revision: Long
) extends WorkflowNotification

object ContentUpdateEvent {
  import Status._

  implicit val tagReads: Reads[Tag] = (
    (__ \ "tag" \ "id").read[Long] ~
    (__ \ "isLead").read[Boolean] ~
    (__ \ "tag" \ "section").read[Section]
  )(Tag.apply _)

  implicit val assetReads: Reads[Asset] = Json.reads[Asset]
  implicit val elementReads: Reads[Element] = Json.reads[Element]
  implicit val thumbnailReads: Reads[Thumbnail] = Json.reads[Thumbnail]
  implicit val blockReads: Reads[Block] = (
    (__ \ "id").read[String] ~
    (__ \ "lastModified").read[Long].map(t => new DateTime(t)) ~
    (__ \ "elements").read[List[Element]]
  )(Block.apply _)

  implicit val contentUpdateEventReads: Reads[ContentUpdateEvent] = (
    (__ \ "content" \ "id").read[String] ~
    (__ \ "content" \ "identifiers").read[Map[String, String]] ~
    (__ \ "content" \ "fields").read[Map[String, String]] ~
    (__ \ "content" \ "mainBlock").readNullable[Block] ~
    (__ \ "content" \ "type").read[String] ~
    (__ \ "whatChanged").read[String] ~
    (__ \ "content" \ "published").read[Boolean] ~
    readUser ~
    (__ \ "content" \ "contentChangeDetails" \ "lastModified" \ "date").read[Long].map(t => new DateTime(t)) ~
    (__ \ "content" \ "taxonomy").readNullable(
      (__ \ "tags").read[List[Tag]]
    ) ~
    (__ \ "content" \ "published").read[Boolean].map(p => if (p) Final else Writers) ~
    (__ \ "content" \ "settings" \ "commentable").readNullable[String].map {
      s => s.exists(_=="true")
    } ~
    (__ \ "content" \ "contentChangeDetails" \ "lastMajorRevisionPublished").readNullable(
      (__ \ "date").read[Long].map(t => new DateTime(t))
    ) ~
    (__ \ "content" \ "contentChangeDetails" \ "published").readNullable(
      (__ \ "date").read[Long].map(t => new DateTime(t))
    ) ~
    (__ \ "content" \ "thumbnail").readNullable[Thumbnail] ~
    (__ \ "content" \ "identifiers" \ "storyBundleId").readNullable[String] ~
    (__ \ "content" \ "contentChangeDetails" \ "revision").readNullable[Long].map(optLong => optLong.getOrElse(0L))
    )(ContentUpdateEvent.apply _)

  def readUser = new Reads[Option[String]] {
    def reads(json: JsValue): JsResult[Option[String]] =
      for {
        firstOpt <- (json \ "contentChangeDetails" \ "lastModified" \ "user" \ "firstName").validate[Option[String]]
        lastOpt  <- (json \ "contentChangeDetails" \ "lastModified" \ "user" \ "lastName").validate[Option[String]]
      }
      yield firstOpt.flatMap(f => lastOpt.map(l => f + " " + l))
  }
}

case class LifecycleEvent(
  composerId: String,
  managedByComposer: Boolean,
  event: String,
  eventTime: DateTime
) extends WorkflowNotification

object LifecycleEvent {
  implicit val lifecycleEventReads: Reads[LifecycleEvent] = (
    (__ \ "composerId").read[String] ~
    (__ \ "managedByComposer").read[Boolean] ~
    (__ \ "event").read[String] ~
    (__ \ "eventTime").read[Long].map(t => new DateTime(t))
  )(LifecycleEvent.apply _)
}