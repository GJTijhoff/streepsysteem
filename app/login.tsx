import { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, ImageBackground, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'

type Member = {
  id: string
  display_name: string
  sort_order: number
  auth_user_id: string | null
}

function makeHiddenEmail(displayName: string) {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug}@streepsysteem.local`
}

export default function LoginScreen() {
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const selectedEmail = useMemo(() => {
    if (!selectedMember) return ''
    return makeHiddenEmail(selectedMember.display_name)
  }, [selectedMember])

  useEffect(() => {
    loadMembers()
    checkExistingSession()
  }, [])

  async function checkExistingSession() {
    const result = await supabase.auth.getSession()

    if (result.data.session) {
      router.replace('/home')
    }
  }

  async function loadMembers() {
    setLoadingMembers(true)
    setMessage('')

    const result = await supabase
      .from('members')
      .select('id, display_name, sort_order, auth_user_id')
      .order('sort_order', { ascending: true })

    if (result.error) {
      setMessage(result.error.message)
      setLoadingMembers(false)
      return
    }

    setMembers((result.data as Member[]) || [])
    setLoadingMembers(false)
  }

  async function handleContinue() {
    setMessage('')

    if (!selectedMember) {
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

    const loginErrorText = loginResult.error.message.toLowerCase()
    const accountMissing =
      loginErrorText.includes('invalid login credentials') ||
      loginErrorText.includes('email not confirmed') ||
      loginErrorText.includes('user not found') ||
      loginErrorText.includes('invalid credentials')

    if (!accountMissing) {
      setMessage(loginResult.error.message)
      setSubmitting(false)
      return
    }

    if (selectedMember.auth_user_id) {
      setMessage('Wrong password')
      setSubmitting(false)
      return
    }

    const signUpResult = await supabase.auth.signUp({
      email: selectedEmail,
      password: password.trim(),
    })

    if (signUpResult.error) {
      setMessage(signUpResult.error.message)
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
      .eq('id', selectedMember.id)
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
            maxWidth: 640,
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 24,
            gap: 20,
          }}
        >
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 30, fontWeight: '700', textAlign: 'center' }}>
              Streepsysteem
            </Text>
            <Text style={{ textAlign: 'center', color: '#555', fontSize: 16 }}>
              Choose your name
            </Text>
            <Text style={{ textAlign: 'center', color: '#777', fontSize: 14 }}>
              First time? Set your password. Next time, enter the same password.
            </Text>
          </View>

          {loadingMembers ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator />
              <Text>Loading members...</Text>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
                justifyContent: 'center',
              }}
            >
              {members.map((member) => {
                const selected = selectedMember?.id === member.id

                return (
                  <Pressable
                    key={member.id}
                    onPress={() => {
                      setSelectedMember(member)
                      setMessage('')
                    }}
                    style={{
                      width: '31%',
                      minWidth: 150,
                      paddingVertical: 16,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: selected ? '#111' : '#ddd',
                      backgroundColor: selected ? '#111' : '#f7f7f7',
                    }}
                  >
                    <Text
                      style={{
                        textAlign: 'center',
                        fontWeight: '600',
                        color: selected ? 'white' : '#111',
                        fontSize: 16,
                      }}
                    >
                      {member.display_name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}

          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 15, color: '#444' }}>
              {selectedMember ? `Selected: ${selectedMember.display_name}` : 'Selected: nobody yet'}
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
              }}
            />

            <Pressable
              onPress={handleContinue}
              disabled={submitting || loadingMembers}
              style={{
                backgroundColor: '#111',
                padding: 15,
                borderRadius: 12,
                alignItems: 'center',
                opacity: submitting || loadingMembers ? 0.6 : 1,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                {submitting ? 'Loading...' : 'Continue'}
              </Text>
            </Pressable>
          </View>

          {message ? (
            <Text style={{ color: '#b00020', textAlign: 'center', fontSize: 14 }}>
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </ImageBackground>
  )
}