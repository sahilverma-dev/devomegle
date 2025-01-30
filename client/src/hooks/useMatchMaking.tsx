// import { useState, useEffect, useMemo } from 'react'
// import {
//     collection,
//     query,
//     where,
//     getDocs,
//     addDoc,
//     setDoc,
//     doc,
//     serverTimestamp,
//     onSnapshot,
//     deleteDoc,
//     updateDoc,
//     Timestamp
// } from 'firebase/firestore'
// import { firestore } from '@/firebase/config'
// import { toast } from 'sonner'

// interface User {
//     uid: string
//     email: string | null
//     displayName: string | null
//     photoURL: string | null
// }

// interface Room {
//     id: string
//     paired: boolean
//     createdBy: User
//     joinedBy?: User
//     timestamp: Timestamp
// }

// export const useMatchmaking = (user: User | null) => {
//     const [isConnected, setIsConnected] = useState(false)
//     const [isSearching, setIsSearching] = useState(false)
//     const [roomId, setRoomId] = useState<string | null>(null)
//     const [currentRoom, setCurrentRoom] = useState<Room | null>(null)

//     // Computed properties for easier access to room states and stranger data
//     const roomState = useMemo(() => {
//         if (!currentRoom || !user) return null

//         const isCreator = currentRoom.createdBy.uid === user.uid
//         const stranger = isCreator ? currentRoom.joinedBy : currentRoom.createdBy

//         return {
//             isCreator,
//             isPaired: currentRoom.paired,
//             stranger,
//             isWaiting: !currentRoom.paired && !currentRoom.joinedBy,
//             role: isCreator ? 'creator' : 'joiner'
//         }
//     }, [currentRoom, user])

//     // Listen for room changes
//     useEffect(() => {
//         if (!roomId || !user) {
//             setIsConnected(false)
//             return
//         }

//         const unsubscribe = onSnapshot(
//             doc(firestore, 'room', roomId),
//             (snapshot) => {
//                 if (snapshot.exists()) {
//                     const roomData = { id: snapshot.id, ...snapshot.data() } as Room
//                     const isCreator = roomData.createdBy.uid === user.uid

//                     // Update connection state based on room data
//                     setIsConnected(roomData.paired)
//                     setCurrentRoom(roomData)

//                     // Handle stranger leaving
//                     if (isCreator && !roomData.joinedBy && roomData.paired === false) {
//                         toast.info('Stranger left the room. Waiting for someone new to join...')
//                     }

//                     // Handle creator leaving (for joiner)
//                     if (!isCreator && roomData.joinedBy?.uid === user.uid && !roomData.createdBy) {
//                         handleRoomCleanup()
//                         toast.error('Room creator left')
//                     }
//                 } else {
//                     // Room was deleted
//                     handleRoomCleanup()
//                     toast.error('Room was closed')
//                 }
//             },
//             (error) => {
//                 console.error('Room listener error:', error)
//                 handleRoomCleanup()
//                 toast.error('Error listening to room updates')
//             }
//         )

//         return () => unsubscribe()
//     }, [roomId, user]) // Removed currentRoom from dependencies

//     // Helper function to clean up room state
//     const handleRoomCleanup = () => {
//         setRoomId(null)
//         setCurrentRoom(null)
//         setIsConnected(false)
//         setIsSearching(false)
//     }

//     // Cleanup room when user leaves
//     useEffect(() => {
//         if (!roomId || !user) return

//         const handleBeforeUnload = (e: BeforeUnloadEvent) => {
//             e.preventDefault()
//             e.returnValue = 'Are you sure you want to leave?'
//         }

//         const cleanup = async () => {
//             try {
//                 const roomRef = doc(firestore, 'room', roomId)
//                 const roomSnapshot = await getDocs(query(collection(firestore, 'room'), where('id', '==', roomId)))

//                 if (!roomSnapshot.empty) {
//                     const room = { id: roomSnapshot.docs[0].id, ...roomSnapshot.docs[0].data() } as Room

//                     if (room.createdBy.uid === user.uid) {
//                         await deleteDoc(roomRef)
//                     } else if (room.joinedBy?.uid === user.uid) {
//                         await updateDoc(roomRef, {
//                             paired: false,
//                             joinedBy: null
//                         })
//                     }
//                 }
//             } catch (error) {
//                 console.error('Cleanup error:', error)
//             }
//         }

//         window.addEventListener('beforeunload', handleBeforeUnload)

//         return () => {
//             window.removeEventListener('beforeunload', handleBeforeUnload)
//             cleanup()
//         }
//     }, [roomId, user])

//     const start = async () => {
//         if (!user) {
//             toast.error('You must be logged in')
//             return
//         }

//         setIsSearching(true)

//         try {
//             const roomsRef = collection(firestore, 'room')
//             const roomsQuery = query(
//                 roomsRef,
//                 where('paired', '==', false),
//                 where('joinedBy', '==', null)
//             )

//             const roomDocs = await getDocs(roomsQuery)
//             const rooms = roomDocs.docs
//                 .map(doc => ({ id: doc.id, ...doc.data() } as Room))
//                 .filter(room => room.createdBy.uid !== user.uid)

//             if (rooms.length === 0) {
//                 const newRoom = await addDoc(roomsRef, {
//                     paired: false,
//                     joinedBy: null,
//                     createdBy: {
//                         uid: user.uid,
//                         email: user.email,
//                         displayName: user.displayName,
//                         photoURL: user.photoURL,
//                     },
//                     timestamp: serverTimestamp()
//                 })

//                 setRoomId(newRoom.id)
//                 toast.success('Waiting for someone to join...')
//             } else {
//                 const randomRoom = rooms[Math.floor(Math.random() * rooms.length)]
//                 const roomRef = doc(firestore, `room/${randomRoom.id}`)

//                 await setDoc(roomRef, {
//                     paired: true,
//                     joinedBy: {
//                         uid: user.uid,
//                         email: user.email,
//                         displayName: user.displayName,
//                         photoURL: user.photoURL,
//                     }
//                 }, { merge: true })

//                 setRoomId(randomRoom.id)
//                 setIsConnected(true)
//                 toast.success('Joined room!')
//             }
//         } catch (error) {
//             console.error('Start error:', error)
//             toast.error('Failed to find room')
//         } finally {
//             setIsSearching(false)
//         }
//     }

//     const leaveRoom = async () => {
//         if (!roomId || !user) return

//         try {
//             const roomRef = doc(firestore, 'room', roomId)

//             if (currentRoom?.createdBy.uid === user.uid) {
//                 await deleteDoc(roomRef)
//             } else if (currentRoom?.joinedBy?.uid === user.uid) {
//                 await updateDoc(roomRef, {
//                     paired: false,
//                     joinedBy: null
//                 })
//             }

//             handleRoomCleanup()
//             toast.success('Left room')
//         } catch (error) {
//             console.error('Leave room error:', error)
//             toast.error('Failed to leave room')
//         }
//     }

//     return {
//         isConnected,
//         isSearching,
//         roomId,
//         currentRoom,
//         roomState,
//         start,
//         leaveRoom
//     }
// }

import { useState, useEffect, useMemo, useRef } from 'react'
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    setDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    deleteDoc,
    updateDoc,
    Timestamp
} from 'firebase/firestore'
import { firestore } from '@/firebase/config'
import { toast } from 'sonner'

interface User {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
}

interface Room {
    id: string
    paired: boolean
    createdBy: User
    joinedBy?: User
    timestamp: Timestamp
}

export const useMatchmaking = (user: User | null) => {
    const [isConnected, setIsConnected] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [roomId, setRoomId] = useState<string | null>(null)
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
    const previousPairedRef = useRef<boolean>(false)

    const roomState = useMemo(() => {
        if (!currentRoom || !user) return null

        const isCreator = currentRoom.createdBy.uid === user.uid
        const stranger = isCreator ? currentRoom.joinedBy : currentRoom.createdBy

        return {
            isCreator,
            isPaired: currentRoom.paired,
            stranger,
            isWaiting: !currentRoom.paired && !currentRoom.joinedBy,
            role: isCreator ? 'creator' : 'joiner'
        }
    }, [currentRoom, user])

    useEffect(() => {
        if (!roomId || !user) {
            setIsConnected(false)
            return
        }

        const unsubscribe = onSnapshot(
            doc(firestore, 'room', roomId),
            (doc) => {
                if (doc.exists()) {
                    const roomData = { id: doc.id, ...doc.data() } as Room
                    const wasConnected = previousPairedRef.current
                    previousPairedRef.current = roomData.paired

                    setCurrentRoom(roomData)
                    setIsConnected(roomData.paired)

                    const isCreator = roomData.createdBy.uid === user.uid

                    if (isCreator && wasConnected && !roomData.joinedBy) {
                        setIsConnected(false)
                        toast.info('Stranger left the room. Waiting for someone new to join...')
                    }

                    if (!isCreator && roomData.joinedBy?.uid === user.uid && !roomData.createdBy) {
                        setRoomId(null)
                        setCurrentRoom(null)
                        setIsConnected(false)
                        setIsSearching(false)
                        toast.error('Room creator left')
                    }
                } else {
                    setRoomId(null)
                    setCurrentRoom(null)
                    setIsConnected(false)
                    setIsSearching(false)
                    toast.error('Room was closed')
                }
            },
            (error) => {
                console.error('Room listener error:', error)
                setIsConnected(false)
                setIsSearching(false)
                toast.error('Error listening to room updates')
            }
        )

        return () => {
            unsubscribe()
            previousPairedRef.current = false
        }
    }, [roomId, user])

    useEffect(() => {
        if (!roomId || !user) return

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // e.preventDefault()
            e.returnValue = 'Are you sure you want to leave?'
        }

        const cleanup = async () => {
            try {
                const roomRef = doc(firestore, 'room', roomId)
                const roomDoc = await getDocs(query(collection(firestore, 'room'), where('id', '==', roomId)))

                if (!roomDoc.empty) {
                    const room = { id: roomDoc.docs[0].id, ...roomDoc.docs[0].data() } as Room

                    if (room.createdBy.uid === user.uid) {
                        await deleteDoc(roomRef)
                    } else if (room.joinedBy?.uid === user.uid) {
                        await updateDoc(roomRef, {
                            paired: false,
                            joinedBy: null
                        })
                    }
                }
            } catch (error) {
                console.error('Cleanup error:', error)
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            cleanup()
        }
    }, [roomId, user])

    const start = async () => {
        if (!user) {
            toast.error('You must be logged in')
            return
        }

        setIsSearching(true)

        try {
            const roomsRef = collection(firestore, 'room')
            const roomsQuery = query(
                roomsRef,
                where('paired', '==', false),
                where('joinedBy', '==', null)
            )

            const roomDocs = await getDocs(roomsQuery)
            const rooms = roomDocs.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Room))
                .filter(room => room.createdBy.uid !== user.uid)

            if (rooms.length === 0) {
                const newRoom = await addDoc(roomsRef, {
                    paired: false,
                    joinedBy: null,
                    createdBy: {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                    },
                    timestamp: serverTimestamp()
                })

                setRoomId(newRoom.id)
                toast.success('Waiting for someone to join...')
            } else {
                const randomRoom = rooms[Math.floor(Math.random() * rooms.length)]
                const roomRef = doc(firestore, `room/${randomRoom.id}`)

                await setDoc(roomRef, {
                    paired: true,
                    joinedBy: {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                    }
                }, { merge: true })

                setRoomId(randomRoom.id)
                setIsConnected(true)
                toast.success('Joined room!')
            }
        } catch (error) {
            console.error('Start error:', error)
            toast.error('Failed to find room')
        } finally {
            setIsSearching(false)
        }
    }

    const leaveRoom = async () => {
        if (!roomId || !user) return

        try {
            const roomRef = doc(firestore, 'room', roomId)

            if (currentRoom?.createdBy.uid === user.uid) {
                await deleteDoc(roomRef)
            } else if (currentRoom?.joinedBy?.uid === user.uid) {
                await updateDoc(roomRef, {
                    paired: false,
                    joinedBy: null
                })
            }

            setRoomId(null)
            setCurrentRoom(null)
            setIsConnected(false)
            setIsSearching(false)
            toast.success('Left room')
        } catch (error) {
            console.error('Leave room error:', error)
            toast.error('Failed to leave room')
        }
    }

    return {
        isConnected,
        isSearching,
        roomId,
        currentRoom,
        roomState,
        start,
        leaveRoom
    }
}