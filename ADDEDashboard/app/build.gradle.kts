// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-add-e.git

plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "de.softopus.add_edashboard"
    compileSdk = 36

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        applicationId = "de.softopus.add_edashboard"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    // implementation("com.google.android.gms:play-services-location:21.3.0")

    implementation("androidx.core:core-ktx:1.12.0")

    // Test-Abhängigkeiten
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}