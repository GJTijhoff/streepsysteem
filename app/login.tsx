import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  display_name: string
}

export default function LoginScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')

  async function loadProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name')
      .order('created_at', { ascending: true })

    if (error) {
      setMessage(error.message)
      return
    }

    setProfiles(data ?? [])
  }

  async function createProfile() {
    setMessage('')

    if (!displayName.trim()) {
      setMessage('Enter a name')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        display_name: displayName.trim(),
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setDisplayName('')
    await loadProfiles()

    router.replace({
      pathname: '/home',
      params: {
        currentUserId: data.id,
        currentUserName: data.display_name,
      },
    })
  }

  function selectProfile(profile: Profile) {
    router.replace({
      pathname: '/home',
      params: {
        currentUserId: profile.id,
        currentUserName: profile.display_name,
      },
    })
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: '600' }}>Choose profile</Text>

      <TextInput
        placeholder="New profile name"
        value={displayName}
        onChangeText={setDisplayName}
        style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
      />

      <Pressable
        onPress={createProfile}
        style={{ padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center' }}
      >
        <Text>Create profile</Text>
      </Pressable>

      {profiles.map((profile) => (
        <Pressable
          key={profile.id}
          onPress={() => selectProfile(profile)}
          style={{ padding: 14, borderRadius: 8, borderWidth: 1 }}
        >
          <Text>{profile.display_name}</Text>
        </Pressable>
      ))}

      {!!message && <Text>{message}</Text>}
    </View>
  )
}