package com.jharkhandgk.app.auth

import android.app.Activity
import com.jharkhandgk.app.R
import com.auth0.android.Auth0
import com.auth0.android.authentication.AuthenticationAPIClient
import com.auth0.android.authentication.AuthenticationException
import com.auth0.android.authentication.storage.CredentialsManager
import com.auth0.android.authentication.storage.SharedPreferencesStorage
import com.auth0.android.callback.Callback
import com.auth0.android.provider.WebAuthProvider
import com.auth0.android.result.Credentials

class Auth0LoginHelper(private val activity: Activity) {
    private val auth0 by lazy {
        Auth0(
            activity.getString(R.string.com_auth0_client_id),
            activity.getString(R.string.com_auth0_domain)
        )
    }

    private val authentication by lazy { AuthenticationAPIClient(auth0) }

    private val credentialsManager by lazy {
        CredentialsManager(
            authentication,
            SharedPreferencesStorage(activity)
        )
    }

    fun login(onSuccess: (String) -> Unit, onError: (String) -> Unit) {
        WebAuthProvider.login(auth0)
            .withScheme(activity.getString(R.string.com_auth0_scheme))
            .withScope("openid profile email")
            .start(activity, object : Callback<Credentials, AuthenticationException> {
                override fun onSuccess(result: Credentials) {
                    credentialsManager.saveCredentials(result)
                    onSuccess(result.idToken)
                }

                override fun onFailure(error: AuthenticationException) {
                    onError(error.message ?: "Auth0 login failed")
                }
            })
    }
}
