package lib

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global
import akka.actor.Actor
import play.api.libs.json.{JsError, JsSuccess}
import play.api.Logger
import com.gu.workflow.syntax.TraverseSyntax._
import com.gu.workflow.db.CommonDB
import models.WorkflowContent


class ComposerSqsReader extends Actor {
  def receive = {

    case SqsReader =>

      for {
        messages <- AWSWorkflowQueue.getMessages(10)
        if messages.nonEmpty
        jsResult = messages.traverse(AWSWorkflowQueue.toWireStatus)
        statuses = jsResult match {
          case JsSuccess(statuses, _) =>  statuses
          case JsError(errors) =>
            Logger.error(errors.toString)
            Nil
        }
        stubs   = CommonDB.getStubs(composerId = statuses.map(_.composerId).toSet)
        content = statuses.flatMap(status => stubs.find(_.composerId == Some(status.composerId))
                          .map(stub => WorkflowContent.fromWireStatus(status, stub)))
        _ <- Future.traverse(messages)(AWSWorkflowQueue.deleteMessage)
      }  {
        content.foreach(CommonDB.createOrModifyContent)
      }

  }

}

case object SqsReader