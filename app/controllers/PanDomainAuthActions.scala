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


  override def invalidUserMessage(claimedAuth: AuthenticatedUser): String = {
    if( (claimedAuth.user.email endsWith ("@guardian.co.uk)")) && !claimedAuth.multiFactor) {
      s"${claimedAuth.user.email} is not valid for use with Workflow as you need to have two factor authentication enabled." +
       s" Please contact the Helpdesk by emailing 34444@theguardian.com or calling 34444 and request access to Composer CMS tools"
    } else {
      s"${claimedAuth.user.email} is not valid for use with Workflow. You need to use your Guardian Google account to login. Please sign in with your Guardian Google account first, then retry logging in"
    }
  }

  override lazy val domain: String = config.getString("pandomain.domain").get
  override lazy val awsSecretAccessKey: String = config.getString("pandomain.aws.secret").get
  override lazy val awsKeyId: String = config.getString("pandomain.aws.keyId").get
  override lazy val system: String = "workflow"
}