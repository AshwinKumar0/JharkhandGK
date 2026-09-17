package com.jharkhandgk.app.data

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("auth/auth0")
    suspend fun loginWithAuth0(@Body body: Auth0LoginRequest): AuthResponse

    @GET("auth/me")
    suspend fun me(): MeResponse

    @GET("learning/questions")
    suspend fun learningQuestions(
        @Query("bankId") bankId: String,
        @Query("start") start: Int,
        @Query("end") end: Int
    ): QuestionsResponse

    @POST("practice/start")
    suspend fun startPractice(@Body body: PracticeStartRequest): PracticeStartResponse

    @POST("practice/answer")
    suspend fun answerPractice(@Body body: PracticeAnswerRequest): PracticeAnswerResponse

    @POST("practice/end")
    suspend fun endPractice(@Body body: PracticeEndRequest)

    @GET("bookmarks")
    suspend fun bookmarks(): QuestionsResponse

    @POST("bookmarks")
    suspend fun addBookmark(@Body body: BookmarkRequest)

    @DELETE("bookmarks/{questionRef}")
    suspend fun removeBookmark(@Path("questionRef", encoded = true) questionRef: String)

    @POST("reports")
    suspend fun report(@Body body: ReportRequest)

    @GET("progress/summary")
    suspend fun progress(): ProgressSummary
}
