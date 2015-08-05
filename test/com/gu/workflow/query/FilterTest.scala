package com.gu.workflow.query

import lib.PostgresDB
import models.{Status, ContentItem, DashboardRow}
import org.scalatest.Matchers
import org.scalatest.matchers.{Matcher, MatchResult}
import models.ContentItem._

object FilterTestOps extends Matchers {

  type Content = List[ContentItem]
  type FieldTest = ContentItem => Boolean

  val noFilter: FieldTest = _ => true

  def statusCheck(s: String): ContentItem => Boolean  = c => status(c) == Some(Status(s))
  val writers: FieldTest = statusCheck("Writers")
  val desk: FieldTest = statusCheck("Desk")
  val subs: FieldTest = statusCheck("Subs")


  def or(a: FieldTest, b: FieldTest): FieldTest = (c) => a(c) || b(c)


  case class FilterTest(p: (ContentItem) => Boolean, testData: Content) {
    val splitTestData = testData.partition(p)

    def compareTo(dbResult: DBResult): Boolean = {
      val (testIn, testOut) = splitTestData
      (dbResult.results sameElements testIn) && (dbResult.rest sameElements testOut)
    }

    def matchWith(query: WfQuery): MatchResult = {
      def prettyPrint(items: Content): String = {
        val ids = items.map(_.stub.id.map(_.toString).getOrElse("?"))
        "ids:" + (if(ids.length > 0) ids.mkString(",") else "<empty>")
      }
      val dbResult = DBResult(query, testData)
      val (testIn, testOut) = splitTestData
      MatchResult(
        compareTo(dbResult),
        s"Result from database (in:${prettyPrint(dbResult.results)}, out:${prettyPrint(dbResult.rest)}) did not contain expected " +
          s"elements (${prettyPrint(testIn)})",
        s"Result from database (${dbResult.results}) contained unexpected elements (" +
          testIn diff dbResult.results + ")"
      )
    }
  }

  case class DBResult(query: WfQuery, inputData: Content) {
    val results = PostgresDB.getContent(query).map(DashboardRow.toContentItem(_))
    val rest = inputData diff results
  }

  class DBResultMatcher(filterTest: FilterTest) extends Matcher[WfQuery] {
    def apply(query: WfQuery) = filterTest.matchWith(query)
  }

  def selectSameResultsAs(filterTest: FilterTest) =
    new DBResultMatcher(filterTest)

}
// trait FilterTestOps extends Matchers {
//   def compare(filter: FilterTest, res: DBResult, testData: Content) = {
//               testData: Content,
//               dbAll: Content,
//               dbIn: Content) = {
//     val (testIn, testOut) = filter.splitTestData(testData)
//     val dbOut = dbAll diff dbIn

//     dbIn should contain theSameElementsAs (testIn)
//   }
// }
