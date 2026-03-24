import { useState } from 'react'
import { View, Text, Pressable, ImageBackground } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const members = [
  { name: 'Rosa', image: require('../assets/members/rosa.png') },
  { name: 'Hidde', image: require('../assets/members/hidde.png') },
  { name: 'Siebe', image: require('../assets/members/siebe.png') },
  { name: 'Annika', image: require('../assets/members/annika.png') },
  { name: 'Eva', image: require('../assets/members/eva.png') },
  { name: 'Isa', image: require('../assets/members/isa.png') },
  { name: 'Lotte', image: require('../assets/members/lotte.png') },
  { name: 'Thijs', image: require('../assets/members/thijs.png') },
  { name: 'Wouda', image: require('../assets/members/wouda.png') },
  { name: 'Gert-Jan', image: require('../assets/members/gertjan.png') },
]

const STORAGE_KEY = 'selected_member'

export default function LoginScreen() {
  const [selectedName, setSelectedName] = useState('')
  const [message, setMessage] = useState('')

  async function handleContinue() {
    setMessage('')

    if (!selectedName) {
      setMessage('Kies eerst je naam')
      return
    }

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        display_name: selectedName,
      })
    )

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
          backgroundColor: 'rgba(0,0,0,0.42)',
          padding: 24,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 760,
            backgroundColor: 'white',
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }}
        >
          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 8,
              color: '#111827',
            }}
          >
            Streepsysteem
          </Text>

          <Text
            style={{
              textAlign: 'center',
              color: '#374151',
              fontSize: 16,
              marginBottom: 4,
            }}
          >
            Kies je naam
          </Text>

          <Text
            style={{
              textAlign: 'center',
              color: '#6b7280',
              fontSize: 14,
              marginBottom: 22,
            }}
          >
            Klik op je naam om verder te gaan
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            {members.map((member) => {
              const selected = selectedName === member.name

              return (
                <Pressable
                    key={member.name}
                    onPress={() => {
                        setSelectedName(member.name)
                        setMessage('')
                    }}
                    style={{
                        width: '18%',
                        aspectRatio: 1,
                        minWidth: 110,
                        marginBottom: 14,
                        borderRadius: 16,
                        overflow: 'hidden',
                        backgroundColor: '#e5e7eb',
                    }}
                    >
                    <ImageBackground
                        source={member.image}
                        resizeMode="cover"
                        imageStyle={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 16,
                        }}
                        style={{
                        flex: 1,
                        justifyContent: 'center',
                        }}
                    >
                        <View
                        style={{
                            flex: 1,
                            borderRadius: 16,
                            borderWidth: 2,
                            borderColor: selected ? '#16a34a' : '#d1d5db',
                            backgroundColor: selected ? 'rgba(22,163,74,0.28)' : 'rgba(0,0,0,0.22)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 10,
                        }}
                        >
                        <Text
                            style={{
                            textAlign: 'center',
                            fontSize: 15,
                            fontWeight: '700',
                            color: 'white',
                            textShadowColor: 'rgba(0,0,0,0.55)',
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 4,
                            }}
                        >
                            {member.name}
                        </Text>
                        </View>
                    </ImageBackground>
                </Pressable>
              )
            })}
          </View>

          <View
            style={{
              backgroundColor: '#f0fdf4',
              borderWidth: 1,
              borderColor: '#bbf7d0',
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 12,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                color: '#166534',
                fontWeight: '600',
              }}
            >
              {selectedName ? `Geselecteerd: ${selectedName}` : 'Nog niemand geselecteerd'}
            </Text>
          </View>

          <Pressable
            onPress={handleContinue}
            style={{
              backgroundColor: '#111827',
              paddingVertical: 15,
              borderRadius: 14,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: 'white',
                fontWeight: '700',
                fontSize: 16,
              }}
            >
              Verder
            </Text>
          </Pressable>

          {message ? (
            <Text
              style={{
                color: '#be123c',
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