package controllers

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.auth._
import com.gu.pandomainauth.PanDomainAuth
import com.gu.pandomainauth.action.AuthActions
import com.gu.pandomainauth.model.AuthenticatedUser
import play.api.Logger
import play.api.mvc._
import config.Config

trait PanDomainAuthActions extends AuthActions with PanDomainAuth with Results {

  import play.api.Play.current

  override def validateUser(authedUser: AuthenticatedUser): Boolean = {
    (authedUser.user.emailDomain == "guardian.co.uk") &&
    (authedUser.multiFactor || (Config.no2faUser.length > 0 && Config.no2faUser == authedUser.user.email))
  }

  override def authCallbackUrl: String = Config.host + "/oauthCallback"

  override def showUnauthedMessage(message: String)(implicit request: RequestHeader): Result = {
    Logger.info(message)
    Ok(views.html.login(Some(message)))
  }

  override def invalidUserMessage(claimedAuth: AuthenticatedUser): String = {
    if( (claimedAuth.user.emailDomain == "guardian.co.uk") && !claimedAuth.multiFactor) {
      s"${claimedAuth.user.email} is not valid for use with Workflow as you need to have two factor authentication enabled." +
       s" Please contact the Helpdesk by emailing 34444@theguardian.com or calling 34444 and request access to Composer CMS tools"
    } else {
      s"${claimedAuth.user.email} is not valid for use with Workflow. You need to use your Guardian Google account to login. Please sign in with your Guardian Google account first, then retry logging in"
    }
  }

  override lazy val domain: String = Config.domain
  override lazy val system: String = "workflow"


  override def awsCredentialsProvider() = new AWSCredentialsProviderChain(
    new ProfileCredentialsProvider("workflow"),
    new InstanceProfileCredentialsProvider(),
    new EnvironmentVariableCredentialsProvider()
  )
}
