package com.jharkhandgk.app.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "session")

class SessionStore(private val context: Context) {
    val token: Flow<String?> = context.dataStore.data.map { preferences -> preferences[TOKEN] }

    suspend fun saveToken(token: String) {
        context.dataStore.edit { preferences -> preferences[TOKEN] = token }
    }

    suspend fun clear() {
        context.dataStore.edit { preferences -> preferences.remove(TOKEN) }
    }

    companion object {
        private val TOKEN = stringPreferencesKey("token")
    }
}
