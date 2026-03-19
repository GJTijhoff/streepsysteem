import { useState } from 'react'
import { View, Text, TextInput, Pressable, ImageBackground } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')

  async function handleAuth() {
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      })

      if (error) {
        setMessage(error.message)
        return
      }

      setMessage('Account created. You can now log in.')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    router.replace('/home')
  }

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1526401485004-2fda9f2c4d4b' }}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 24,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: '600', textAlign: 'center' }}>
            Streepsysteem
          </Text>

          {mode === 'signup' && (
            <TextInput
              placeholder="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              style={inputStyle}
            />
          )}

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={inputStyle}
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={inputStyle}
          />

          <Pressable style={buttonStyle} onPress={handleAuth}>
            <Text style={{ color: 'white', fontWeight: '600' }}>
              {mode === 'login' ? 'Log in' : 'Sign up'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setMessage('')
            }}
          >
            <Text style={{ textAlign: 'center', color: '#555' }}>
              {mode === 'login'
                ? 'Need an account? Sign up'
                : 'Already have an account? Log in'}
            </Text>
          </Pressable>

          {message ? <Text style={{ color: 'red', textAlign: 'center' }}>{message}</Text> : null}
        </View>
      </View>
    </ImageBackground>
  )
}

const inputStyle = {
  borderWidth: 1,
  borderColor: '#ddd',
  padding: 12,
  borderRadius: 10,
}

const buttonStyle = {
  backgroundColor: '#111',
  padding: 14,
  borderRadius: 10,
  alignItems: 'center',
}