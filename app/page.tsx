"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Mic, ArrowLeft, HeartHandshake, Heart } from "lucide-react"
import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  original: string
  translated: string
  sender: "user" | "other"
  timestamp: Date
}

export default function PamelaApp() {
  const [currentPage, setCurrentPage] = useState<"welcome" | "chat">("welcome")
  const [roomCode, setRoomCode] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("pt") // Default to Portuguese
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [usersCount, setUsersCount] = useState(0)
  
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  const handleStartChat = () => {
    if (roomCode === "sun_pamelavieira" && selectedLanguage) {
      // Initialize socket connection
      socketRef.current = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}`)
      
      socketRef.current.on('connect', () => {
        console.log('Connected to server')
        setIsConnected(true)
        
        // Join the room
        socketRef.current?.emit('join-room', {
          roomCode,
          language: selectedLanguage
        })
      })

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from server')
        setIsConnected(false)
      })

      socketRef.current.on('receive-message', (message: Message) => {
        setMessages(prev => [...prev, message])
      })

      socketRef.current.on('user-joined', (data) => {
        setUsersCount(data.usersCount)
        console.log('User joined:', data)
      })

      socketRef.current.on('user-left', (data) => {
        setUsersCount(data.usersCount)
        console.log('User left:', data)
      })

      setCurrentPage("chat")
    }
  }

  const handleSendMessage = () => {
    if (newMessage.trim() && socketRef.current) {
      const message: Message = {
        id: Date.now().toString(),
        original: newMessage,
        translated: "", // Will be filled by translation
        sender: "user",
        timestamp: new Date(),
      }

      // Add message to local state immediately
      setMessages(prev => [...prev, { ...message, translated: newMessage }])
      
      // Send message through socket
      socketRef.current.emit('send-message', {
        message,
        roomCode
      })
      
      setNewMessage("")
    }
  }

  const handleLeaveChat = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setMessages([])
    setIsConnected(false)
    setUsersCount(0)
    setCurrentPage("welcome")
  }

  if (currentPage === "welcome") {
    return (
      <>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-rose-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 space-y-6">
            {/* Header with heart icon */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-rose-100 rounded-full">
                  <HeartHandshake className="w-8 h-8 text-rose-500" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 leading-relaxed">
                { selectedLanguage === "en" ? "I’m just someone curious to know who you are." : "Sou apenas alguém curioso para saber quem você é." }
                {/* This line is for Portuguese, you can remove it if not needed */}
              </h1>
              <p className="text-slate-600 text-lg">
                { selectedLanguage === "en" ? "Language won’t stand in our way." : "A língua não será um obstáculo para nós." }
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  { selectedLanguage === "en" ? "Secret Code" : "Código Secreto" }
                </label>
                <Input
                  placeholder={`${
                    selectedLanguage === "en"
                      ? "Enter code here (get it from Cody)..."
                      : "Digite o código aqui (obtenha com Cody)..."
                  }`}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="h-12 text-lg border-slate-200 focus:border-rose-300 focus:ring-rose-200"
                />
              </div>

              <div className="space-y-3 w-full">
                <div className="text-sm font-medium text-slate-700">
                  { selectedLanguage === "en" ? "Select your language" : "Selecione seu idioma" }
                </div>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="h-12 w-full text-lg border-slate-200 focus:border-rose-300 focus:ring-rose-200">
                    <SelectValue placeholder={selectedLanguage === "en" ? "Select your language" : "Selecione seu idioma"}   />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleStartChat}
                disabled={!roomCode || !selectedLanguage || roomCode !== "sun_pamelavieira"}
                className="w-full h-12 text-lg bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                { selectedLanguage === "en" ? "Start Chat" : "Iniciar Conversa" }
              </Button>
            </div>
          </CardContent>
        </Card> 
      </div>
      <div>
         {/* add a small footer here that says "Built with the heart" */}
        <div className="text-center text-sm text-slate-500 py-4 fixed bottom-0 w-full">
          <div className="flex justify-center items-center space-x-1">
            <div>
            { selectedLanguage === "en" ? "Built with the" : "Construído com o" }
            </div>
            <Heart className="inline-block w-4 h-4 text-rose-500 ml-1" />
             <div>
            { selectedLanguage === "en" ? "by Cody" : "por Cody" }
            </div>
          </div>
        </div>
      </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-rose-50 to-indigo-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeaveChat}
            className="text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Leave Chat
          </Button>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-slate-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-slate-600">•</span>
            <span className="text-sm text-slate-600">{usersCount} user{usersCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full overflow-auto h-screen">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-white/60 rounded-2xl inline-block">
              <p className="text-slate-500 text-lg">Start your conversation...</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl space-y-1 ${
                  message.sender === "user" ? "bg-rose-500 text-white" : "bg-white text-slate-800 shadow-sm"
                }`}
              >
                <p className="text-base leading-relaxed">{message.original}</p>
                {message.original !== message.translated && (
                  <p
                    className={`text-sm opacity-75 italic border-t pt-1 ${
                      message.sender === "user" ? "border-rose-400" : "border-slate-200"
                    }`}
                  >
                    {message.translated}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200 p-4 sticky bottom-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="h-12 text-lg pr-12 border-slate-200 focus:border-rose-300 focus:ring-rose-200 rounded-xl"
                disabled={!isConnected}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <Mic className="w-5 h-5" />
              </Button>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="h-12 w-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}