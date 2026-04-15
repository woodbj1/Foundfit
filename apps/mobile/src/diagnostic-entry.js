/**
 * Diagnostic entry point — bypasses expo-router entirely.
 * Registers a bare React Native component via Expo's registerRootComponent.
 * If this screen appears, the base Expo + React Native + Hermes runtime is healthy
 * and the crash must originate in expo-router or a module it imports.
 */
import { registerRootComponent } from 'expo'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

function DiagnosticApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FoundFit - Build 20 Diagnostic</Text>
      <Text style={styles.body}>
        If you can read this, the base Expo + React Native runtime is working.
      </Text>
      <Text style={styles.body}>
        The crash is in expo-router initialization, not the core runtime.
      </Text>
      <Text style={styles.hint}>Screenshot this and share it.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fbf6fd',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 16,
  },
})

registerRootComponent(DiagnosticApp)
