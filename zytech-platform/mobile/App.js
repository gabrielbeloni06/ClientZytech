import React, { useState, useEffect, useRef } from 'react';
import { Text, View, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, Platform, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const WEBSITE_URL = "https://clientzytech.com.br"; 

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <View style={s.container}>
      <Text style={s.logo}>Zytech Mobile</Text>
      <TextInput 
        placeholder="Email" 
        placeholderTextColor="#666"
        style={s.input} 
        onChangeText={setEmail} 
        autoCapitalize='none'
      />
      <TextInput 
        placeholder="Senha" 
        placeholderTextColor="#666"
        secureTextEntry 
        style={s.input} 
        onChangeText={setPassword} 
      />
      <TouchableOpacity style={s.btn} onPress={() => onLogin(email, password, setLoading)}>
         {loading ? <ActivityIndicator color="#fff"/> : <Text style={s.btnText}>Entrar</Text>}
      </TouchableOpacity>
    </View>
  );
}

function DashboardScreen({ supabase, user }) {
  const [stats, setStats] = useState({ messages: 0, appointments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile) return;

    const orgId = profile.organization_id;

    const today = new Date().toISOString().split('T')[0];
    const { count: msgCount } = await supabase.from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', today);

    const { count: apptCount } = await supabase.from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'confirmed');

    setStats({ messages: msgCount || 0, appointments: apptCount || 0 });
    setLoading(false);
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Visão Geral</Text>
        <TouchableOpacity onPress={fetchStats}><Ionicons name="refresh" size={20} color="#fff"/></TouchableOpacity>
      </View>
      
      <View style={s.content}>
        <View style={s.card}>
            <Ionicons name="chatbubbles" size={24} color="#3b82f6" />
            <Text style={s.cardValue}>{stats.messages}</Text>
            <Text style={s.cardLabel}>Mensagens Hoje</Text>
        </View>

        <View style={s.card}>
            <Ionicons name="calendar" size={24} color="#a855f7" />
            <Text style={s.cardValue}>{stats.appointments}</Text>
            <Text style={s.cardLabel}>Agendamentos</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ChatListScreen({ supabase, user }) {
  const [chats, setChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    setRefreshing(true);
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile) return;

    const { data } = await supabase
        .from('chat_messages')
        .select('phone, content, created_at, sender_name')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(50);
    
    const uniqueMap = new Map();
    data?.forEach(msg => {
        if (!uniqueMap.has(msg.phone)) uniqueMap.set(msg.phone, msg);
    });

    setChats(Array.from(uniqueMap.values()));
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={s.safeArea}>
       <View style={s.header}>
        <Text style={s.headerTitle}>Conversas</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={item => item.phone}
        refreshing={refreshing}
        onRefresh={loadChats}
        renderItem={({ item }) => (
          <View style={s.chatItem}>
             <View style={s.avatar}><Text style={s.avatarText}>{item.sender_name?.[0] || '?'}</Text></View>
             <View style={{flex: 1}}>
                <Text style={s.chatName}>{item.sender_name || item.phone}</Text>
                <Text style={s.chatMsg} numberOfLines={1}>{item.content}</Text>
             </View>
             <Text style={s.chatTime}>{new Date(item.created_at).getHours()}:{String(new Date(item.created_at).getMinutes()).padStart(2,'0')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  const [supabase, setSupabase] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`${WEBSITE_URL}/api/mobile-config`);
        const config = await res.json();
        if (config.supabaseUrl) {
            const client = createClient(config.supabaseUrl, config.supabaseKey);
            setSupabase(client);
            setReady(true);
        }
      } catch (e) {
        Alert.alert("Erro", "Falha ao conectar.");
      }
    }
    init();
  }, []);

  const handleLogin = async (email, password, setLoading) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        Alert.alert("Erro", "Credenciais inválidas");
        setLoading(false);
    } else {
        setUser(data.user);
        registerPushToken(data.user.id, supabase);
    }
  };

  const registerPushToken = async (userId, sb) => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    
    const { data: profile } = await sb.from('profiles').select('organization_id').eq('id', userId).single();
    if (profile) {
        await sb.from('user_push_tokens').upsert({
            user_id: userId,
            organization_id: profile.organization_id,
            token: tokenData.data,
            device_type: Platform.OS
        }, { onConflict: 'token' });
    }
  };

  if (!ready) return <View style={s.center}><ActivityIndicator size="large" color="#3b82f6"/></View>;

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: '#0a0a0a', borderTopColor: '#222' },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: 'gray',
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'Dashboard') iconName = 'stats-chart';
            else if (route.name === 'Conversas') iconName = 'chatbubbles';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard">
            {() => <DashboardScreen supabase={supabase} user={user} />}
        </Tab.Screen>
        <Tab.Screen name="Conversas">
             {() => <ChatListScreen supabase={supabase} user={user} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 20 },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  logo: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#111', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  btn: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  
  content: { padding: 20, flexDirection: 'row', gap: 15 },
  card: { flex: 1, backgroundColor: '#111', padding: 20, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  cardValue: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginVertical: 5 },
  cardLabel: { color: '#666', fontSize: 12 },

  chatItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#111', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  chatName: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  chatMsg: { color: '#888', fontSize: 12, marginTop: 2 },
  chatTime: { color: '#444', fontSize: 10 }
});