package com.jharkhandgk.app.data

import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: String,
    val name: String,
    val usernameOrEmail: String,
    val preferredLanguage: String,
    val xp: Int = 0,
    val streak: Int = 0
)

@Serializable
data class AuthResponse(
    val token: String,
    val user: UserDto
)

@Serializable
data class MeResponse(val user: UserDto)

@Serializable
data class RegisterRequest(
    val name: String,
    val usernameOrEmail: String,
    val password: String,
    val preferredLanguage: String
)

@Serializable
data class LoginRequest(val usernameOrEmail: String, val password: String)

@Serializable
data class Auth0LoginRequest(val idToken: String, val preferredLanguage: String)

@Serializable
data class QuestionDto(
    val questionRef: String,
    val bankId: String,
    val questionId: String,
    val chapterId: String? = null,
    val chapterTitle: String? = null,
    val sourceQuestionNumber: Int,
    val sourcePageStart: Int? = null,
    val sourcePageEnd: Int? = null,
    val type: String? = null,
    val question: String,
    val options: List<OptionDto>,
    val explanation: String = "",
    val examFacts: List<String> = emptyList(),
    val value: Int? = null
)

@Serializable
data class OptionDto(val key: String, val text: String, val rawText: String? = null)

@Serializable
data class QuestionsResponse(val questions: List<QuestionDto>)

@Serializable
data class PracticeStartRequest(val bankId: String, val rangeStart: Int, val rangeEnd: Int)

@Serializable
data class PracticeStartResponse(
    val sessionId: String,
    val nextQuestion: QuestionDto?,
    val questions: List<QuestionDto> = emptyList(),
    val totalAvailable: Int = 0,
    val nextBatchAvailable: Boolean = false
)

@Serializable
data class PracticeAnswerRequest(
    val sessionId: String,
    val questionRef: String,
    val selectedOptionKey: String? = null,
    val timeTakenMs: Int,
    val timedOut: Boolean,
    val answerId: String? = null
)

@Serializable
data class PracticeAnswerResponse(
    val isCorrect: Boolean,
    val correctOptionKey: String,
    val explanation: String,
    val examFacts: List<String>,
    val updatedValue: Int,
    val nextQuestion: QuestionDto?
)

@Serializable
data class PracticeEndRequest(val sessionId: String)

@Serializable
data class ReportRequest(
    val questionRef: String,
    val reason: String,
    val message: String = "",
    val suggestedTopicTitle: String = "",
    val suggestedTags: List<String> = emptyList()
)

@Serializable
data class ProgressSummary(
    val questionsPracticed: Int = 0,
    val correctAnswers: Int = 0,
    val wrongAnswers: Int = 0,
    val timeouts: Int = 0,
    val completionRate: Double = 0.0,
    val weakQuestionCount: Int = 0,
    val xp: Int = 0,
    val streak: Int = 0
)
