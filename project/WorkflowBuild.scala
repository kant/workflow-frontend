import sbt._
import sbt.Keys._
import play.Keys._
import plugins.PlayArtifact._
import sbtassembly.Plugin.{AssemblyKeys, MergeStrategy}
import AssemblyKeys._
import play.Keys.jdbc


object WorkflowBuild extends Build {

  val commonSettings =
    Seq(
      scalaVersion := "2.10.3",
      scalaVersion in ThisBuild := "2.10.3",
      organization := "com.gu",
      version      := "0.1",
      resolvers ++= Seq("Typesafe Repository" at "http://repo.typesafe.com/typesafe/releases/"),
      scalacOptions ++= Seq("-feature", "-deprecation", "-language:higherKinds", "-Xfatal-warnings")
    )

  val root = playProject("prototype")
    .settings(
      libraryDependencies ++= Seq(
        "com.amazonaws" % "aws-java-sdk" % "1.7.5",
        "com.typesafe.akka" %% "akka-agent" % "2.2.0",
        jdbc,
        "com.typesafe.play" %% "play-slick" % "0.6.0.1",
        "com.github.tototoshi" %% "slick-joda-mapper" % "1.1.0",
        "org.postgresql" % "postgresql" % "9.3-1100-jdbc4"
      ),
      requireJs += "main.js",
      requireJsShim += "main.js"
    )

  def playProject(path: String): Project =
    play.Project(path, path = file(path))
      .settings(commonSettings ++ playArtifactDistSettings ++ playArtifactSettings: _*)
      .settings(magentaPackageName := path)

  def playArtifactSettings = Seq(
    ivyXML :=
      <dependencies>
        <exclude org="commons-logging"/>
        <exclude org="org.springframework"/>
        <exclude org="org.scala-tools.sbt"/>
      </dependencies>,
    mergeStrategy in assembly <<= (mergeStrategy in assembly) { old => {
      case f if f.startsWith("org/apache/lucene/index/") => MergeStrategy.first
      case "play/core/server/ServerWithStop.class" => MergeStrategy.first
      case "ehcache.xml" => MergeStrategy.first
      case x => old(x)
    }}
  )

}
