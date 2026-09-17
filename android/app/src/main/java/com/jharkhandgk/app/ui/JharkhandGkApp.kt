package com.jharkhandgk.app.ui

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jharkhandgk.app.auth.Auth0LoginHelper
import com.jharkhandgk.app.data.QuestionDto
import kotlinx.coroutines.delay

@Composable
fun JharkhandGkApp(viewModel: AppViewModel = viewModel()) {
    val state by viewModel.state.collectAsState()

    Scaffold { padding ->
        when {
            state.user == null -> AuthScreen(state, viewModel, Modifier.padding(padding))
            else -> MainScreen(state, viewModel, Modifier.padding(padding))
        }
    }
}

@Composable
private fun AuthScreen(state: UiState, viewModel: AppViewModel, modifier: Modifier = Modifier) {
    var isRegister by remember { mutableStateOf(true) }
    var name by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var language by remember { mutableStateOf("hi") }
    val context = LocalContext.current

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text("Jharkhand GK", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
        Text("Serious practice for state GK.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(24.dp))

        if (isRegister) {
            OutlinedTextField(name, { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
        }
        OutlinedTextField(username, { username = it }, label = { Text("Email or username") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            password,
            { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        if (isRegister) {
            Spacer(Modifier.height(12.dp))
            LanguageSelector(language) { language = it }
        }
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {
                if (isRegister) viewModel.register(name, username, password, language)
                else viewModel.login(username, password)
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (isRegister) "Create account" else "Log in")
        }

        Spacer(Modifier.height(8.dp))
        Button(
            onClick = {
                val activity = context as? Activity ?: return@Button
                Auth0LoginHelper(activity).login(
                    onSuccess = { idToken -> viewModel.loginWithAuth0(idToken, language) },
                    onError = { error -> viewModel.showError(error) }
                )
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Continue with Auth0")
        }

        OutlinedButton(onClick = { isRegister = !isRegister }, modifier = Modifier.fillMaxWidth()) {
            Text(if (isRegister) "I already have an account" else "Create a new account")
        }
        StatusLine(state)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LanguageSelector(language: String, onLanguageChange: (String) -> Unit) {
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
        listOf("hi" to "Hindi", "en" to "English").forEachIndexed { index, item ->
            SegmentedButton(
                selected = language == item.first,
                onClick = { onLanguageChange(item.first) },
                shape = SegmentedButtonDefaults.itemShape(index, 2)
            ) { Text(item.second) }
        }
    }
}

@Composable
private fun MainScreen(state: UiState, viewModel: AppViewModel, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Namaste, ${state.user?.name.orEmpty()}", style = MaterialTheme.typography.titleLarge)
                Text("XP ${state.user?.xp ?: 0} • Streak ${state.user?.streak ?: 0}")
            }
            IconButton(onClick = viewModel::logout) { Icon(Icons.Default.Logout, contentDescription = "Logout") }
        }
        Spacer(Modifier.height(12.dp))
        RangeAndMode(state, viewModel)
        Spacer(Modifier.height(12.dp))

        when (state.mode) {
            AppMode.Learning -> LearningScreen(state, viewModel)
            AppMode.Practice -> PracticeScreen(state, viewModel)
            AppMode.Revision -> RevisionScreen(state, viewModel)
        }
        StatusLine(state)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RangeAndMode(state: UiState, viewModel: AppViewModel) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = state.rangeStart,
            onValueChange = { viewModel.setRange(it, state.rangeEnd) },
            label = { Text("From") },
            modifier = Modifier.weight(1f)
        )
        OutlinedTextField(
            value = state.rangeEnd,
            onValueChange = { viewModel.setRange(state.rangeStart, it) },
            label = { Text("To") },
            modifier = Modifier.weight(1f)
        )
    }
    Spacer(Modifier.height(8.dp))
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
        listOf(AppMode.Practice, AppMode.Learning, AppMode.Revision).forEachIndexed { index, mode ->
            SegmentedButton(
                selected = state.mode == mode,
                onClick = { viewModel.setMode(mode) },
                shape = SegmentedButtonDefaults.itemShape(index, 3)
            ) { Text(mode.name) }
        }
    }
}

@Composable
private fun LearningScreen(state: UiState, viewModel: AppViewModel) {
    val question = state.learningQuestions.getOrNull(state.learningIndex)
    if (question == null) {
        ModeLauncher("Learning Mode", "Study calmly with manual next and inline explanations.", Icons.Default.School) {
            viewModel.startLearning()
        }
    } else {
        QuestionCard(
            question = question,
            selectedKey = null,
            correctKey = null,
            onSelect = {},
            onBookmark = { viewModel.addBookmark(question.questionRef) },
            onReport = { reason, message, topic, tags -> viewModel.report(question.questionRef, reason, message, topic, tags) }
        )
        Spacer(Modifier.height(8.dp))
        Text(question.explanation, style = MaterialTheme.typography.bodyMedium)
        question.examFacts.forEach { fact ->
            AssistChip(onClick = {}, label = { Text(fact) })
        }
        Button(onClick = viewModel::nextLearningQuestion, modifier = Modifier.fillMaxWidth()) {
            Text("Next")
        }
    }
}

@Composable
private fun PracticeScreen(state: UiState, viewModel: AppViewModel) {
    val question = state.practiceQuestion
    if (question == null) {
        ModeLauncher("Practice Mode", "Timed adaptive practice based on your question values.", Icons.Default.PlayArrow) {
            viewModel.startPractice()
        }
        return
    }

    var remaining by remember(question.questionRef) { mutableIntStateOf(30) }
    var locked by remember(question.questionRef) { mutableStateOf(false) }
    var selected by remember(question.questionRef) { mutableStateOf<String?>(null) }

    LaunchedEffect(question.questionRef, locked) {
        while (!locked && remaining > 0) {
            delay(1000)
            remaining -= 1
        }
        if (!locked && remaining == 0) {
            locked = true
            viewModel.answerPractice(null, 30_000, timedOut = true)
        }
    }

    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text("Time: ${remaining}s", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold)
        OutlinedButton(onClick = viewModel::endPractice) { Text("End session") }
    }
    QuestionCard(
        question = question,
        selectedKey = selected,
        correctKey = state.lastResult?.correctOptionKey,
        onSelect = { key ->
            if (!locked) {
                locked = true
                selected = key
                val timeTaken = (30 - remaining) * 1000
                viewModel.answerPractice(key, timeTaken, timedOut = false)
            }
        },
        onBookmark = { viewModel.addBookmark(question.questionRef) },
        onReport = { reason, message, topic, tags -> viewModel.report(question.questionRef, reason, message, topic, tags) }
    )
    state.lastResult?.let { result ->
        Spacer(Modifier.height(8.dp))
        Text(if (result.isCorrect) "Correct" else "Correct answer: ${result.correctOptionKey}", fontWeight = FontWeight.Bold)
        Text(result.explanation)
    }
}

@Composable
private fun RevisionScreen(state: UiState, viewModel: AppViewModel) {
    LaunchedEffect(Unit) { viewModel.loadBookmarks(); viewModel.loadProgress() }
    ModeLauncher("Revision Mode", "Start with bookmarked questions and your weak-question count.", Icons.Default.Timeline) {
        viewModel.loadBookmarks()
    }
    Text("Weak questions: ${state.progress.weakQuestionCount}")
    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(state.bookmarks) { question ->
            QuestionCard(
                question = question,
                selectedKey = null,
                correctKey = null,
                onSelect = {},
                onBookmark = { viewModel.removeBookmark(question.questionRef) },
                onReport = { reason, message, topic, tags -> viewModel.report(question.questionRef, reason, message, topic, tags) }
            )
        }
    }
}

@Composable
private fun ModeLauncher(title: String, body: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onStart: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(icon, contentDescription = null)
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(body)
            Button(onClick = onStart, modifier = Modifier.fillMaxWidth()) { Text("Start") }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun QuestionCard(
    question: QuestionDto,
    selectedKey: String?,
    correctKey: String?,
    onSelect: (String) -> Unit,
    onBookmark: () -> Unit,
    onReport: (String, String, String, String) -> Unit
) {
    var showReport by remember { mutableStateOf(false) }
    Card {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Q${question.sourceQuestionNumber}", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text("Page ${question.sourcePageStart ?: "-"}")
                IconButton(onClick = onBookmark) { Icon(Icons.Default.Bookmark, contentDescription = "Bookmark") }
                IconButton(onClick = { showReport = true }) { Icon(Icons.Default.Flag, contentDescription = "Report") }
            }
            Text(question.question, style = MaterialTheme.typography.titleMedium)
            question.options.forEach { option ->
                val label = when {
                    correctKey == option.key -> "${option.key}. ${option.text} ✓"
                    selectedKey == option.key -> "${option.key}. ${option.text}"
                    else -> "${option.key}. ${option.text}"
                }
                OutlinedButton(onClick = { onSelect(option.key) }, modifier = Modifier.fillMaxWidth()) {
                    Text(label)
                }
            }
        }
    }

    if (showReport) {
        ReportSheet(
            onDismiss = { showReport = false },
            onSubmit = { reason, message, topic, tags ->
                onReport(reason, message, topic, tags)
                showReport = false
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReportSheet(onDismiss: () -> Unit, onSubmit: (String, String, String, String) -> Unit) {
    var reason by remember { mutableStateOf("Wrong answer") }
    var message by remember { mutableStateOf("") }
    var topic by remember { mutableStateOf("") }
    var tags by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Report question", style = MaterialTheme.typography.titleLarge)
            LazyColumn(contentPadding = PaddingValues(vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(listOf("Wrong answer", "Typo", "Confusing wording", "Bad explanation", "Suggest topic/tag", "Other")) { item ->
                    AssistChip(onClick = { reason = item }, label = { Text(if (reason == item) "✓ $item" else item) })
                }
            }
            OutlinedTextField(message, { message = it }, label = { Text("Details") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(topic, { topic = it }, label = { Text("Suggested topic") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(tags, { tags = it }, label = { Text("Tags, comma separated") }, modifier = Modifier.fillMaxWidth())
            Button(onClick = { onSubmit(reason, message, topic, tags) }, modifier = Modifier.fillMaxWidth()) {
                Text("Submit")
            }
        }
    }
}

@Composable
private fun StatusLine(state: UiState) {
    Spacer(Modifier.height(8.dp))
    if (state.loading) CircularProgressIndicator()
    state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
}
