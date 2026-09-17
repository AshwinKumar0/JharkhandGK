package com.jharkhandgk.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.jharkhandgk.app.data.ApiClient
import com.jharkhandgk.app.data.Auth0LoginRequest
import com.jharkhandgk.app.data.LoginRequest
import com.jharkhandgk.app.data.PracticeAnswerRequest
import com.jharkhandgk.app.data.PracticeEndRequest
import com.jharkhandgk.app.data.PracticeStartRequest
import com.jharkhandgk.app.data.ProgressSummary
import com.jharkhandgk.app.data.QuestionDto
import com.jharkhandgk.app.data.RegisterRequest
import com.jharkhandgk.app.data.ReportRequest
import com.jharkhandgk.app.data.SessionStore
import com.jharkhandgk.app.data.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.UUID

data class UiState(
    val token: String? = null,
    val user: UserDto? = null,
    val bankId: String = "jharkhand-pocket-gk-mcqs",
    val rangeStart: String = "1",
    val rangeEnd: String = "10",
    val mode: AppMode = AppMode.Practice,
    val loading: Boolean = false,
    val error: String? = null,
    val learningQuestions: List<QuestionDto> = emptyList(),
    val learningIndex: Int = 0,
    val practiceSessionId: String? = null,
    val practiceQuestion: QuestionDto? = null,
    val pendingPracticeQuestion: QuestionDto? = null,
    val practiceQuestionBuffer: List<QuestionDto> = emptyList(),
    val lastResult: PracticeResult? = null,
    val progress: ProgressSummary = ProgressSummary()
)

data class PracticeResult(
    val isCorrect: Boolean,
    val correctOptionKey: String,
    val explanation: String,
    val examFacts: List<String>,
    val updatedValue: Int
)

enum class AppMode { Learning, Practice }

class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val sessionStore = SessionStore(application)
    private var currentToken: String? = null
    private val api = ApiClient.create { currentToken }
    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state

    init {
        viewModelScope.launch {
            currentToken = sessionStore.token.first()
            _state.value = _state.value.copy(token = currentToken)
            if (currentToken != null) {
                runCatching { api.me() }
                    .onSuccess { _state.value = _state.value.copy(user = it.user) }
                    .onFailure { sessionStore.clear(); currentToken = null; _state.value = UiState() }
            }
        }
    }

    fun register(name: String, username: String, password: String, language: String) = viewModelScope.launch {
        runApi {
            val response = api.register(RegisterRequest(name, username, password, language))
            saveAuth(response.token, response.user)
        }
    }

    fun login(username: String, password: String) = viewModelScope.launch {
        runApi {
            val response = api.login(LoginRequest(username, password))
            saveAuth(response.token, response.user)
        }
    }

    fun loginWithAuth0(idToken: String, language: String) = viewModelScope.launch {
        runApi {
            val response = api.loginWithAuth0(Auth0LoginRequest(idToken, language))
            saveAuth(response.token, response.user)
        }
    }

    fun showError(message: String) {
        _state.value = _state.value.copy(error = message)
    }

    fun logout() = viewModelScope.launch {
        sessionStore.clear()
        currentToken = null
        _state.value = UiState()
    }

    fun setRange(start: String, end: String) {
        _state.value = _state.value.copy(rangeStart = start, rangeEnd = end)
    }

    fun setMode(mode: AppMode) {
        _state.value = _state.value.copy(mode = mode, lastResult = null)
    }

    fun startLearning() = viewModelScope.launch {
        runApi {
            val state = _state.value
            val response = api.learningQuestions(state.bankId, state.rangeStart.toInt(), state.rangeEnd.toInt())
            _state.value = _state.value.copy(learningQuestions = response.questions, learningIndex = 0)
        }
    }

    fun nextLearningQuestion() {
        val state = _state.value
        if (state.learningIndex < state.learningQuestions.lastIndex) {
            _state.value = state.copy(learningIndex = state.learningIndex + 1)
        }
    }

    fun startPractice() = viewModelScope.launch {
        runApi {
            val state = _state.value
            val response = api.startPractice(
                PracticeStartRequest(state.bankId, state.rangeStart.toInt(), state.rangeEnd.toInt())
            )
            _state.value = _state.value.copy(
                practiceSessionId = response.sessionId,
                practiceQuestion = response.nextQuestion,
                practiceQuestionBuffer = response.questions.drop(1),
                pendingPracticeQuestion = null,
                lastResult = null
            )
        }
    }

    fun answerPractice(selectedOptionKey: String?, timeTakenMs: Int, timedOut: Boolean) = viewModelScope.launch {
        runApi {
            val state = _state.value
            val sessionId = state.practiceSessionId ?: return@runApi
            val question = state.practiceQuestion ?: return@runApi
            val bufferedNext = state.practiceQuestionBuffer.firstOrNull()
            val response = api.answerPractice(
                PracticeAnswerRequest(
                    sessionId,
                    question.questionRef,
                    selectedOptionKey,
                    timeTakenMs,
                    timedOut,
                    UUID.randomUUID().toString()
                )
            )
            _state.value = _state.value.copy(
                pendingPracticeQuestion = bufferedNext ?: response.nextQuestion,
                lastResult = PracticeResult(
                    response.isCorrect,
                    response.correctOptionKey,
                    response.explanation,
                    response.examFacts,
                    response.updatedValue
                )
            )
        }
    }

    fun advancePracticeQuestion() {
        val state = _state.value
        _state.value = state.copy(
            practiceQuestion = state.pendingPracticeQuestion,
            practiceQuestionBuffer = if (state.practiceQuestionBuffer.isNotEmpty()) {
                state.practiceQuestionBuffer.drop(1)
            } else {
                state.practiceQuestionBuffer
            },
            pendingPracticeQuestion = null,
            lastResult = null
        )
    }

    fun endPractice() = viewModelScope.launch {
        val sessionId = _state.value.practiceSessionId ?: return@launch
        runApi {
            api.endPractice(PracticeEndRequest(sessionId))
            _state.value = _state.value.copy(
                practiceSessionId = null,
                practiceQuestion = null,
                pendingPracticeQuestion = null,
                practiceQuestionBuffer = emptyList(),
                lastResult = null
            )
        }
    }

    fun report(questionRef: String, reason: String, message: String, topic: String, tags: String) = viewModelScope.launch {
        runApi {
            api.report(
                ReportRequest(
                    questionRef = questionRef,
                    reason = reason,
                    message = message,
                    suggestedTopicTitle = topic,
                    suggestedTags = tags.split(",").map { it.trim() }.filter { it.isNotBlank() }
                )
            )
        }
    }

    fun loadProgress() = viewModelScope.launch {
        runApi { _state.value = _state.value.copy(progress = api.progress()) }
    }

    private suspend fun saveAuth(token: String, user: UserDto) {
        currentToken = token
        sessionStore.saveToken(token)
        _state.value = _state.value.copy(token = token, user = user)
    }

    private suspend fun runApi(block: suspend () -> Unit) {
        _state.value = _state.value.copy(loading = true, error = null)
        runCatching { block() }
            .onFailure { error -> _state.value = _state.value.copy(error = error.message ?: "Something went wrong") }
        _state.value = _state.value.copy(loading = false)
    }
}
