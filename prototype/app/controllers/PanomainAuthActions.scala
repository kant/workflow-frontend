package controllers

import com.gu.pandomainauth.action.AuthActions
import com.gu.pandomainauth.model.AuthenticatedUser
import play.api.Logger
import play.api.mvc._

trait PanDomainAuthActions extends AuthActions with Results {

  import play.api.Play.current
  lazy val config = play.api.Play.configuration

  override def validateUser(authedUser: AuthenticatedUser): Boolean = {
    (authedUser.user.email endsWith ("@guardian.co.uk")) && authedUser.multiFactor
  }

  override def authCallbackUrl: String = config.getString("host").get + "/oauthCallback"

  override def showUnauthedMessage(message: String)(implicit request: RequestHeader): Result = {
    Logger.info(message)
    Ok(views.html.login(Some(message)))
  }

  override lazy val domain: String = config.getString("pandomain.domain").get
  override lazy val awsSecretAccessKey: String = config.getString("pandomain.aws.secret").get
  override lazy val awsKeyId: String = config.getString("pandomain.aws.keyId").get
  override lazy val system: String = "workflow"
}
