import { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, ImageBackground } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'

const memberNames = [
  'Rosa',
  'Hidde',
  'Siebe',
  'Annika',
  'Eva',
  'Isa',
  'Lotte',
  'Thijs',
  'Wouda',
  'Gert-Jan',
]

function makeHiddenEmail(displayName: string) {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug}@streepsysteem.local`
}

export default function LoginScreen() {
  const [selectedName, setSelectedName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedEmail = useMemo(() => {
    if (!selectedName) return ''
    return makeHiddenEmail(selectedName)
  }, [selectedName])

  useEffect(() => {
    checkExistingSession()
  }, [])

  async function checkExistingSession() {
    const result = await supabase.auth.getSession()

    if (result.data.session) {
      router.replace('/home')
    }
  }

  async function handleContinue() {
    setMessage('')

    if (!selectedName) {
      setMessage('Select your name')
      return
    }

    if (password.trim().length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)

    const loginResult = await supabase.auth.signInWithPassword({
      email: selectedEmail,
      password: password.trim(),
    })

    if (!loginResult.error) {
      router.replace('/home')
      setSubmitting(false)
      return
    }

    const signUpResult = await supabase.auth.signUp({
      email: selectedEmail,
      password: password.trim(),
    })

    if (signUpResult.error) {
      setMessage('Wrong password or account setup failed')
      setSubmitting(false)
      return
    }

    const newAuthUserId = signUpResult.data.user?.id

    if (!newAuthUserId) {
      setMessage('Could not create account')
      setSubmitting(false)
      return
    }

    const linkResult = await supabase
      .from('members')
      .update({ auth_user_id: newAuthUserId })
      .eq('display_name', selectedName)
      .is('auth_user_id', null)

    if (linkResult.error) {
      setMessage(linkResult.error.message)
      setSubmitting(false)
      return
    }

    const secondLoginResult = await supabase.auth.signInWithPassword({
      email: selectedEmail,
      password: password.trim(),
    })

    if (secondLoginResult.error) {
      setMessage(secondLoginResult.error.message)
      setSubmitting(false)
      return
    }

    router.replace('/home')
    setSubmitting(false)
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
          backgroundColor: 'rgba(0,0,0,0.45)',
          padding: 24,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 760,
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 24,
          }}
        >
          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Streepsysteem
          </Text>

          <Text
            style={{
              textAlign: 'center',
              color: '#555',
              fontSize: 16,
              marginBottom: 6,
            }}
          >
            Choose your name
          </Text>

          <Text
            style={{
              textAlign: 'center',
              color: '#777',
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            First time? Set your password. Next time, enter the same password.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            {memberNames.map((name) => {
              const selected = selectedName === name

              return (
                <Pressable
                  key={name}
                  onPress={() => {
                    setSelectedName(name)
                    setMessage('')
                  }}
                  style={{
                    width: '18%',
                    aspectRatio: 1,
                    minWidth: 110,
                    marginBottom: 16,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: selected ? '#111' : '#d6d6d6',
                    backgroundColor: selected ? '#111' : '#f4f4f4',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 10,
                  }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      fontSize: 16,
                      fontWeight: '600',
                      color: selected ? 'white' : '#111',
                    }}
                  >
                    {name}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Text
            style={{
              fontSize: 15,
              color: '#444',
              marginBottom: 10,
            }}
          >
            {selectedName ? `Selected: ${selectedName}` : 'Selected: nobody yet'}
          </Text>

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              padding: 14,
              borderRadius: 12,
              fontSize: 16,
              marginBottom: 12,
            }}
          />

          <Pressable
            onPress={handleContinue}
            disabled={submitting}
            style={{
              backgroundColor: '#111',
              padding: 15,
              borderRadius: 12,
              alignItems: 'center',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: 'white',
                fontWeight: '700',
                fontSize: 16,
              }}
            >
              {submitting ? 'Loading...' : 'Continue'}
            </Text>
          </Pressable>

          {message ? (
            <Text
              style={{
                color: '#b00020',
                textAlign: 'center',
                fontSize: 14,
                marginTop: 14,
              }}
            >
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </ImageBackground>
  )
}