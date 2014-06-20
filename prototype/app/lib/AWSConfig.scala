package lib

import scala.collection.JavaConverters._
import com.amazonaws.auth.BasicAWSCredentials
import com.amazonaws.services.sqs.AmazonSQSClient
import com.amazonaws.services.sqs.model.{DeleteMessageRequest, ReceiveMessageRequest, Message}
import models.WireStatus
import play.api.libs.json.{JsResult, JsValue, Json}
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model._
import java.io.ByteArrayInputStream
import scala.concurrent.{ExecutionContext, Future}
import scala.io.Source
import ExecutionContext.Implicits.global


object AWSCreds {
  import play.api.Play.current
  val config = play.api.Play.configuration

  private val accessKey = config.getString("aws.key").getOrElse("blah")
  private val secret = config.getString("aws.secret").getOrElse("blah")

  lazy val basic = new BasicAWSCredentials(accessKey, secret)
}

object AWSWorkflowBucket {

  lazy val s3Client = new AmazonS3Client(AWSCreds.basic)

  lazy val name = AWSCreds.config.getString("aws.stub.bucket").getOrElse(sys.error("Required: aws.stub.bucket"))

  lazy val key = "tmp/stubs.txt"

  def putJson(json: JsValue): Future[PutObjectResult] = {
    val stream = new ByteArrayInputStream(json.toString.getBytes("UTF-8"))
    val request = new PutObjectRequest(name, key, stream, new ObjectMetadata())
    Future(s3Client.putObject(request))
  }

  //reads stubs file
  def readStubsFile: Future[String] = {
    for {
      stubsFile <- Future(AWSWorkflowBucket.s3Client.getObject(new GetObjectRequest(name, key)))
      stream <- Future(stubsFile.getObjectContent)
    } yield {
      val is = Source.fromInputStream(stream)
      is.getLines.mkString
    }
  }

}

object AWSWorkflowQueue {

  lazy val sqsClient = {
    val client = new AmazonSQSClient(AWSCreds.basic)
    client.setEndpoint("sqs.eu-west-1.amazonaws.com")
    client
  }

  lazy val queueUrl = AWSCreds.config.getString("aws.flex.notifications.queue")
    .getOrElse(sys.error("Required: aws.flex.notifications.queue"))

  def getMessages(messageCount: Int): Future[List[Message]] = Future {
    sqsClient.receiveMessage(
      new ReceiveMessageRequest(queueUrl).withMaxNumberOfMessages(messageCount)
    ).getMessages.asScala.toList
  }

  def deleteMessage(message: Message): Future[Unit] = Future {
    sqsClient.deleteMessage(
      new DeleteMessageRequest(queueUrl, message.getReceiptHandle)
    )
  }

  //todo validate the json
  def toWireStatus(awsMsg: Message): JsResult[WireStatus] = {
    val body = Json.parse(awsMsg.getBody)
    (body \ "Message").validate[String].flatMap { msg =>
      Json.parse(msg).validate[WireStatus]
    }

  }
}