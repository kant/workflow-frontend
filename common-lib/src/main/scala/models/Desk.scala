package models

import play.api.libs.json._

case class Desk(name: String, selected: Boolean = false, id: Long = 0) {
  override def toString: String = name
}

object Desk {
  implicit val deskReads: Reads[Desk] = new Reads[Desk] {
    def reads(jsValue: JsValue): JsResult[Desk] = (jsValue \ "tag" \ "desk" \ "name").validate[String].map(Desk(_))
  }

  implicit val desk: Format[Desk] = Json.format[Desk]

  def fromSerialised(sd: SerialisedDesk): Desk = {
    Desk(
      name = sd.name,
      selected = sd.selected,
      id = sd.id
    )
  }
}

case class SerialisedDesk(name: String, selected: Boolean = false, id: Long = 0)
object SerialisedDesk { implicit val jsonFormats: Format[SerialisedDesk] = Json.format[SerialisedDesk] }
