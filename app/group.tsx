import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'

type Group = {
  id: string
  name: string
}

export default function GroupScreen() {
  const [groupName, setGroupName] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [message, setMessage] = useState('')

  async function loadGroups() {
    setMessage('')

    const { data, error } = await supabase
      .from('groups')
      .select('id, name')
      .order('created_at', { ascending: true })

    if (error) {
      setMessage(error.message)
      return
    }

    setGroups(data ?? [])
  }

  async function createGroup() {
    setMessage('')

    if (!groupName.trim()) {
      setMessage('Enter a group name')
      return
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      setMessage(userError.message)
      return
    }

    const userId = userData.user?.id

    if (!userId) {
      setMessage('No logged-in user found')
      return
    }

    const { data: createdGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: groupName.trim(),
        created_by: userId,
      })
      .select()
      .single()

    if (groupError) {
      setMessage(groupError.message)
      return
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: createdGroup.id,
        user_id: userId,
      })

    if (memberError) {
      setMessage(memberError.message)
      return
    }

    setGroupName('')
    await loadGroups()
  }

  useEffect(() => {
    loadGroups()
  }, [])

  return (
    <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '600' }}>Your groups</Text>

      <TextInput
        placeholder="Group name"
        value={groupName}
        onChangeText={setGroupName}
        style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
      />

      <Pressable
        onPress={createGroup}
        style={{ padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center' }}
      >
        <Text>Create group</Text>
      </Pressable>

      {groups.map((group) => (
        <Pressable
          key={group.id}
          onPress={() =>
            router.push({
              pathname: '/home',
              params: { groupId: group.id, groupName: group.name },
            })
          }
          style={{ padding: 14, borderRadius: 8, borderWidth: 1 }}
        >
          <Text>{group.name}</Text>
        </Pressable>
      ))}

      {!!message && <Text>{message}</Text>}
    </View>
  )
}