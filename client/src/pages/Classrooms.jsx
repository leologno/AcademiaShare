import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  Users, Plus, LogIn, ChevronLeft, Send, FileText, 
  Trash2, User, Megaphone, Calendar, Share2, Shield,
  Settings, Trash, CheckSquare, UploadCloud, UsersRound,
  Video, VideoOff, Mic, MicOff, Palette, LogOut, Copy, RefreshCw
} from 'lucide-react';

const RemoteVideo = ({ stream }) => {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="absolute inset-0 w-full h-full object-cover rounded-xl animate-fade-in"
    />
  );
};

const Classrooms = () => {
  const { user, socket } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Form States
  const [newClassName, setNewClassName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [myNotes, setMyNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState('');

  // Classroom Material Upload States
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  // Announcement Comments State (announcementId -> text)
  const [commentTextMap, setCommentTextMap] = useState({});

  // Class Representatives Assignment States
  const [crStudentId, setCrStudentId] = useState('');
  const [crPowers, setCrPowers] = useState({
    canPostAnnouncements: false,
    canShareNotes: false,
    canDeleteComments: false
  });

  // Live Class / Meeting States
  const [inMeeting, setInMeeting] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [brushColor, setBrushColor] = useState('#6366f1');
  const [brushSize, setBrushSize] = useState(3);

  // Real-time Zoom/Meet state additions
  const [participants, setParticipants] = useState([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showMeetChat, setShowMeetChat] = useState(false);
  const [meetMessages, setMeetMessages] = useState([]);
  const [newMeetMsg, setNewMeetMsg] = useState('');

  // WebRTC mesh & moderation state overrides
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBoardLocked, setIsBoardLocked] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [pinnedSocketId, setPinnedSocketId] = useState(null);

  const pcsRef = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});

  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  useEffect(() => {
    fetchClassrooms();
    fetchMyNotes();
  }, []);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classrooms');
      setClassrooms(res.data);
      setError('');
    } catch (err) {
      console.error('Error fetching classrooms:', err);
      setError('Failed to load classrooms.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyNotes = async () => {
    try {
      const res = await api.get('/notes');
      setMyNotes(res.data);
    } catch (err) {
      console.error('Error fetching notes to share:', err);
    }
  };

  const leaveMeeting = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setInMeeting(false);
    setIsHandRaised(false);
    setShowMeetChat(false);
  };

  // Join Classroom room on Socket.IO
  useEffect(() => {
    if (socket && selectedClassroom) {
      socket.emit('classroom:join', selectedClassroom._id);
    }
  }, [socket, selectedClassroom]);

  // Handle meeting events
  useEffect(() => {
    if (!socket) return;

    const handleMeetingStart = (data) => {
      if (selectedClassroom && selectedClassroom._id === data.classroomId) {
        fetchClassroomDetails(data.classroomId);
      }
    };

    const handleMeetingEnd = (data) => {
      if (selectedClassroom && selectedClassroom._id === data.classroomId) {
        fetchClassroomDetails(data.classroomId);
        leaveMeeting();
      }
    };

    socket.on('classroom:meeting-started', handleMeetingStart);
    socket.on('classroom:meeting-ended', handleMeetingEnd);

    return () => {
      socket.off('classroom:meeting-started', handleMeetingStart);
      socket.off('classroom:meeting-ended', handleMeetingEnd);
    };
  }, [socket, selectedClassroom, localStream]);

  // Handle mounting ref race condition for video stream
  useEffect(() => {
    if (localVideoRef.current && localStream && !isCamOff) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCamOff]);

  // Handle in-meeting real-time events (participants, raise hand, chat messages, WebRTC signals, locks)
  useEffect(() => {
    if (!socket || !inMeeting || !selectedClassroom) return;

    // Join the meeting room
    socket.emit('classroom:join-meeting', {
      classroomId: selectedClassroom._id,
      user: { _id: user._id, username: user.username, role: user.role }
    });

    const handleParticipantsUpdate = (data) => {
      setParticipants(data);
    };

    const handleNewMeetingMessage = (msg) => {
      setMeetMessages(prev => [...prev, msg]);
    };

    const handleSignal = async (data) => {
      const { from, signal } = data;
      const pc = pcsRef.current[from];
      if (!pc) return;

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc:signal', {
              to: from,
              signal: { sdp: pc.localDescription }
            });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Signal handle failed:', err);
      }
    };

    const handleMutedByTeacher = () => {
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsMuted(true);
          socket.emit('meeting:toggle-mute', {
            classroomId: selectedClassroom._id,
            isMuted: true
          });
        }
      }
      setError('You have been muted by the instructor.');
    };

    const handleBoardLockedStatus = (data) => {
      setIsBoardLocked(data.isLocked);
      setError(data.isLocked ? 'Whiteboard drawing has been locked by the instructor.' : 'Whiteboard drawing has been unlocked.');
    };

    socket.on('meeting:participants', handleParticipantsUpdate);
    socket.on('meeting:message', handleNewMeetingMessage);
    socket.on('webrtc:signal', handleSignal);
    socket.on('meeting:muted-by-teacher', handleMutedByTeacher);
    socket.on('meeting:board-locked-status', handleBoardLockedStatus);

    return () => {
      socket.emit('classroom:leave-meeting', { classroomId: selectedClassroom._id });
      socket.off('meeting:participants', handleParticipantsUpdate);
      socket.off('meeting:message', handleNewMeetingMessage);
      socket.off('webrtc:signal', handleSignal);
      socket.off('meeting:muted-by-teacher', handleMutedByTeacher);
      socket.off('meeting:board-locked-status', handleBoardLockedStatus);
      setParticipants([]);
      setMeetMessages([]);
    };
  }, [socket, inMeeting, selectedClassroom, user, localStream]);

  // Manage WebRTC RTCPeerConnections dynamically as roster updates
  useEffect(() => {
    if (!socket || !inMeeting || !localStream) return;

    const remotePeers = participants.filter(p => p.socketId !== socket.id);

    // Clean up peers who left
    Object.keys(pcsRef.current).forEach(sid => {
      if (!remotePeers.some(p => p.socketId === sid)) {
        if (pcsRef.current[sid]) {
          pcsRef.current[sid].close();
          delete pcsRef.current[sid];
        }
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[sid];
          return next;
        });
      }
    });

    // Create connections for new peers
    remotePeers.forEach(peer => {
      const sid = peer.socketId;
      if (!pcsRef.current[sid]) {
        console.log(`Creating Peer Connection for peer: ${sid}`);
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pcsRef.current[sid] = pc;

        // Add local tracks
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc:signal', {
              to: sid,
              signal: { candidate: event.candidate }
            });
          }
        };

        pc.ontrack = (event) => {
          console.log(`Received remote track from ${sid}`);
          setRemoteStreams(prev => ({
            ...prev,
            [sid]: event.streams[0]
          }));
        };

        // Roster negotiation: user with larger socket ID initiates offer
        if (socket.id > sid) {
          console.log(`Negotiating offer to peer: ${sid}`);
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              socket.emit('webrtc:signal', {
                to: sid,
                signal: { sdp: pc.localDescription }
              });
            })
            .catch(err => console.error('Failed to create offer:', err));
        }
      }
    });
  }, [participants, localStream, inMeeting, socket]);

  // Handle Whiteboard drawing sync
  useEffect(() => {
    if (!socket || !selectedClassroom || !inMeeting || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const handleRemoteDraw = (data) => {
      ctx.beginPath();
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
    };

    const handleRemoteClear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('classroom:draw', handleRemoteDraw);
    socket.on('classroom:clear', handleRemoteClear);

    return () => {
      socket.off('classroom:draw', handleRemoteDraw);
      socket.off('classroom:clear', handleRemoteClear);
    };
  }, [socket, selectedClassroom, inMeeting]);

  const startDrawing = (e) => {
    if (!canvasRef.current) return;
    isDrawing.current = true;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    lastX.current = (clientX - rect.left) * scaleX;
    lastY.current = (clientY - rect.top) * scaleY;
  };

  const draw = (e) => {
    if (!isDrawing.current || !canvasRef.current || !socket || !selectedClassroom) return;
    
    // Board locked presenter mode check
    if (isBoardLocked && !isTeacher && user.role !== 'Admin') {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const currentX = (clientX - rect.left) * scaleX;
    const currentY = (clientY - rect.top) * scaleY;

    const activeColor = isEraserMode ? '#0f172a' : brushColor;
    const activeSize = isEraserMode ? brushSize * 4 : brushSize;

    ctx.beginPath();
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = activeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    socket.emit('classroom:draw', {
      classroomId: selectedClassroom._id,
      x0: lastX.current,
      y0: lastY.current,
      x1: currentX,
      y1: currentY,
      color: activeColor,
      thickness: activeSize
    });

    lastX.current = currentX;
    lastY.current = currentY;
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearWhiteboard = () => {
    if (!canvasRef.current || !socket || !selectedClassroom) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    socket.emit('classroom:clear', { classroomId: selectedClassroom._id });
  };

  const fetchClassroomDetails = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/classrooms/${id}`);
      setSelectedClassroom(res.data);
      setError('');
    } catch (err) {
      console.error('Error fetching classroom details:', err);
      setError('Failed to load classroom workspace.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMeeting = async () => {
    if (!selectedClassroom) return;
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await api.post(`/classrooms/${selectedClassroom._id}/meeting/start`);
      setSelectedClassroom(res.data);
      
      // Emit socket start event to alert room
      if (socket) {
        socket.emit('classroom:meeting-start', {
          classroomId: selectedClassroom._id,
          code: res.data.meeting.code
        });
      }

      setSuccess('Classroom session launched!');
      setInMeeting(true);
      setTimeout(() => startMedia(), 100);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to start meeting.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndMeeting = async () => {
    if (!selectedClassroom) return;
    if (!window.confirm('Are you sure you want to end this classroom session? This will disconnect all students.')) return;
    
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const res = await api.post(`/classrooms/${selectedClassroom._id}/meeting/end`);
      setSelectedClassroom(res.data);

      // Emit socket end event
      if (socket) {
        socket.emit('classroom:meeting-end', { classroomId: selectedClassroom._id });
      }

      leaveMeeting();
      setSuccess('Meeting session ended.');
    } catch (err) {
      console.error(err);
      setError('Failed to end meeting.');
    } finally {
      setActionLoading(false);
    }
  };

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Could not access camera/microphone. Collaborative drawing board remains active.');
    }
  };

  const handleJoinMeeting = () => {
    setError('');
    setSuccess('');
    setInMeeting(true);
    setTimeout(() => startMedia(), 100);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        if (socket && selectedClassroom) {
          socket.emit('meeting:toggle-mute', {
            classroomId: selectedClassroom._id,
            isMuted: !audioTrack.enabled
          });
        }
      }
    }
  };

  const toggleCam = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
        if (socket && selectedClassroom) {
          socket.emit('meeting:toggle-cam', {
            classroomId: selectedClassroom._id,
            isCamOff: !videoTrack.enabled
          });
        }
      }
    }
  };

  const toggleRaiseHand = () => {
    if (!socket || !selectedClassroom) return;
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    socket.emit('meeting:raise-hand', {
      classroomId: selectedClassroom._id,
      isHandRaised: nextState
    });
  };

  const handleSendMeetMsg = (e) => {
    e.preventDefault();
    if (!newMeetMsg.trim() || !socket || !selectedClassroom) return;
    socket.emit('meeting:send-message', {
      classroomId: selectedClassroom._id,
      message: {
        sender: user.username,
        text: newMeetMsg.trim()
      }
    });
    setNewMeetMsg('');
  };

  const handleToggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace track in all peer connections
        Object.keys(pcsRef.current).forEach(sid => {
          const pc = pcsRef.current[sid];
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Save reference to original video track so we can restore it
        localStream.screenTrack = screenTrack;
        localStream.originalVideoTrack = localStream.getVideoTracks()[0];

        // Replace local stream video track
        localStream.removeTrack(localStream.originalVideoTrack);
        localStream.addTrack(screenTrack);

        // When screen share track ends naturally
        screenTrack.onended = () => {
          stopScreenSharing();
        };

        setIsScreenSharing(true);
        if (socket && selectedClassroom) {
          socket.emit('meeting:toggle-screen-share', {
            classroomId: selectedClassroom._id,
            isScreenSharing: true
          });
        }
        // Force refresh local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.srcObject = localStream;
        }
      } else {
        stopScreenSharing();
      }
    } catch (err) {
      console.error('Screen share failed:', err);
    }
  };

  const stopScreenSharing = () => {
    if (localStream && localStream.screenTrack) {
      localStream.screenTrack.stop();
      if (localStream.originalVideoTrack) {
        localStream.removeTrack(localStream.screenTrack);
        localStream.addTrack(localStream.originalVideoTrack);
      }
      
      // Restore video track in all peer connections
      Object.keys(pcsRef.current).forEach(sid => {
        const pc = pcsRef.current[sid];
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && localStream.originalVideoTrack) {
          sender.replaceTrack(localStream.originalVideoTrack);
        }
      });

      delete localStream.screenTrack;
      delete localStream.originalVideoTrack;
    }
    setIsScreenSharing(false);
    if (socket && selectedClassroom) {
      socket.emit('meeting:toggle-screen-share', {
        classroomId: selectedClassroom._id,
        isScreenSharing: false
      });
    }
    // Force refresh local video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.srcObject = localStream;
    }
  };

  const downloadWhiteboard = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${selectedClassroom.name}-whiteboard.png`;
    link.href = image;
    link.click();
  };

  const handleMuteAll = () => {
    if (!socket || !selectedClassroom) return;
    socket.emit('meeting:mute-all', { classroomId: selectedClassroom._id });
    setSuccess('Muted all students.');
  };

  const handleToggleBoardLock = () => {
    if (!socket || !selectedClassroom) return;
    const nextLock = !isBoardLocked;
    setIsBoardLocked(nextLock);
    socket.emit('meeting:lock-board', { classroomId: selectedClassroom._id, isLocked: nextLock });
    setSuccess(nextLock ? 'Whiteboard locked (Presenter Mode)' : 'Whiteboard unlocked');
  };

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    if (!newClassName) return;

    try {
      setActionLoading(true);
      setError('');
      // Code is automatically generated on server side now
      const res = await api.post('/classrooms', {
        name: newClassName
      });
      setSuccess(`Classroom "${res.data.name}" created successfully with code: ${res.data.code}`);
      setClassrooms([res.data, ...classrooms]);
      setShowCreateModal(false);
      setNewClassName('');
    } catch (err) {
      console.error('Error creating classroom:', err);
      setError(err.response?.data?.message || 'Failed to create classroom.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinClassroom = async (e) => {
    e.preventDefault();
    if (!joinCode) return;

    try {
      setActionLoading(true);
      setError('');
      const res = await api.post('/classrooms/join', { code: joinCode.trim() }); // Case sensitive code matching
      setSuccess(`Successfully joined classroom: ${res.data.classroom.name}`);
      setClassrooms([res.data.classroom, ...classrooms]);
      setShowJoinModal(false);
      setJoinCode('');
      fetchClassroomDetails(res.data.classroom._id);
    } catch (err) {
      console.error('Error joining classroom:', err);
      setError(err.response?.data?.message || 'Failed to join classroom.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementText.trim() || !selectedClassroom) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/classrooms/${selectedClassroom._id}/announcement`, {
        text: announcementText
      });
      setSelectedClassroom({
        ...selectedClassroom,
        announcements: res.data
      });
      setAnnouncementText('');
    } catch (err) {
      console.error('Error posting announcement:', err);
      setError(err.response?.data?.message || 'Failed to post announcement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (announcementId) => {
    const commentText = commentTextMap[announcementId];
    if (!commentText || !commentText.trim() || !selectedClassroom) return;

    try {
      const res = await api.post(`/classrooms/${selectedClassroom._id}/announcements/${announcementId}/comments`, {
        text: commentText
      });
      setSelectedClassroom({
        ...selectedClassroom,
        announcements: res.data
      });
      setCommentTextMap({
        ...commentTextMap,
        [announcementId]: ''
      });
    } catch (err) {
      console.error('Error posting comment:', err);
      setError('Failed to post comment.');
    }
  };

  const handleDeleteComment = async (announcementId, commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    if (!selectedClassroom) return;

    try {
      const res = await api.delete(`/classrooms/${selectedClassroom._id}/announcements/${announcementId}/comments/${commentId}`);
      setSelectedClassroom({
        ...selectedClassroom,
        announcements: res.data
      });
      setSuccess('Comment deleted successfully.');
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment.');
    }
  };

  const handleShareNote = async (e) => {
    e.preventDefault();
    if (!selectedNoteId || !selectedClassroom) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/classrooms/${selectedClassroom._id}/share`, {
        noteId: selectedNoteId
      });
      
      fetchClassroomDetails(selectedClassroom._id);
      setShowShareModal(false);
      setSelectedNoteId('');
      setSuccess('Note shared with classroom successfully.');
    } catch (err) {
      console.error('Error sharing note:', err);
      setError(err.response?.data?.message || 'Failed to share note.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!uploadTitle || !uploadFile || !selectedClassroom) return;

    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      formData.append('category', uploadCategory);
      formData.append('classroomId', selectedClassroom._id);
      formData.append('noteFile', uploadFile);

      await api.post('/notes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Study material uploaded to classroom successfully.');
      fetchClassroomDetails(selectedClassroom._id);
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadCategory('General');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error uploading material:', err);
      setError(err.response?.data?.message || 'Failed to upload material.');
    } finally {
      setActionLoading(false);
    }
  };

  // Class Representatives Controls
  const handleAssignCR = async (e) => {
    e.preventDefault();
    if (!crStudentId || !selectedClassroom) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/classrooms/${selectedClassroom._id}/representatives`, {
        studentId: crStudentId,
        powers: crPowers
      });
      setSelectedClassroom(res.data);
      setCrStudentId('');
      setCrPowers({
        canPostAnnouncements: false,
        canShareNotes: false,
        canDeleteComments: false
      });
      setSuccess('Class representative assigned successfully.');
    } catch (err) {
      console.error('Error assigning representative:', err);
      setError(err.response?.data?.message || 'Failed to assign class representative.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCRPowers = async (studentId, updatedPowers) => {
    if (!selectedClassroom) return;

    try {
      const res = await api.post(`/classrooms/${selectedClassroom._id}/representatives`, {
        studentId,
        powers: updatedPowers
      });
      setSelectedClassroom(res.data);
      setSuccess('Representative permissions updated.');
    } catch (err) {
      console.error('Error updating powers:', err);
      setError('Failed to update representative permissions.');
    }
  };

  const handleRevokeCR = async (studentId) => {
    if (!window.confirm('Are you sure you want to revoke this student\'s class representative status?')) return;
    if (!selectedClassroom) return;

    try {
      const res = await api.delete(`/classrooms/${selectedClassroom._id}/representatives/${studentId}`);
      setSelectedClassroom(res.data);
      setSuccess('Class representative status revoked.');
    } catch (err) {
      console.error('Error revoking representative:', err);
      setError('Failed to revoke class representative.');
    }
  };

  // Permissions checkers for current user
  const isTeacher = selectedClassroom && (
    selectedClassroom.teacher._id === user._id || selectedClassroom.teacher === user._id
  );
  
  const crDetails = selectedClassroom && selectedClassroom.classRepresentatives?.find(
    r => r.student._id === user._id || r.student === user._id
  );
  const isCR = !!crDetails;

  const canPostAnnouncements = isTeacher || user.role === 'Admin' || (isCR && crDetails.powers?.canPostAnnouncements);
  const canShareNotes = isTeacher || user.role === 'Admin' || (isCR && crDetails.powers?.canShareNotes);
  const canDeleteComments = isTeacher || user.role === 'Admin' || (isCR && crDetails.powers?.canDeleteComments);

  const screenSharingParticipant = participants.find(p => p.isScreenSharing);
  const pinnedParticipant = pinnedSocketId ? participants.find(p => p.socketId === pinnedSocketId) : null;

  // Decide what to render in the main container:
  // 1. Screen sharing takes first priority
  // 2. Pinned participant takes second priority
  // 3. Shared Interactive Whiteboard is the default
  let mainViewContent = 'whiteboard';
  let activeStreamToRender = null;
  let activeStreamName = '';
  let activeStreamIsMe = false;

  if (pinnedParticipant) {
    mainViewContent = 'pin';
    activeStreamIsMe = pinnedParticipant.userId === user._id || pinnedParticipant.socketId === socket.id;
    activeStreamToRender = activeStreamIsMe ? localStream : remoteStreams[pinnedParticipant.socketId];
    activeStreamName = `@${pinnedParticipant.username}'s Pinned Stream`;
  } else if (screenSharingParticipant) {
    mainViewContent = 'screenshare';
    activeStreamIsMe = screenSharingParticipant.userId === user._id || screenSharingParticipant.socketId === socket.id;
    activeStreamToRender = activeStreamIsMe ? localStream : remoteStreams[screenSharingParticipant.socketId];
    activeStreamName = `@${screenSharingParticipant.username}'s Screen Share`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-gray-200">
      
      {/* Alert Notices */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-600/10 border border-red-500/20 text-red-400 text-sm">
          {error}
          <button className="float-right font-bold" onClick={() => setError('')}>✕</button>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {success}
          <button className="float-right font-bold" onClick={() => setSuccess('')}>✕</button>
        </div>
      )}
      {selectedClassroom && inMeeting && (
        /* --- Fullscreen Video Conferencing & Whiteboard Suite --- */
        <div className="space-y-6 animate-fade-in bg-gray-950 p-6 rounded-2xl border border-gray-800 shadow-2xl">
            {/* Suite Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-800 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">{selectedClassroom.name}</h2>
                  {isBoardLocked && (
                    <span className="text-[9px] bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      🔒 Presenter Mode Only
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">Live Video Class & Shared Interactive Whiteboard</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end text-xs">
                {/* Teacher / Admin Moderation Tools */}
                {(isTeacher || user.role === 'Admin') && (
                  <div className="flex items-center gap-2 mr-2 border-r border-gray-850 pr-3">
                    <button
                      onClick={handleMuteAll}
                      className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-900/40 text-red-400 rounded-lg text-xs font-semibold transition"
                      title="Mute all students microphones"
                    >
                      Mute All
                    </button>
                    <button
                      onClick={handleToggleBoardLock}
                      className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition ${
                        isBoardLocked 
                          ? 'bg-amber-600/20 border-amber-500/40 text-amber-400 hover:bg-amber-600/30' 
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                      title={isBoardLocked ? 'Unlock whiteboard for students' : 'Lock whiteboard (Presenter Mode)'}
                    >
                      {isBoardLocked ? 'Unlock Board' : 'Lock Board'}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + `/classrooms?join=${selectedClassroom.code}`);
                    setSuccess('Class invite link copied!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-lg text-xs font-semibold text-gray-300 transition"
                  title="Copy Join Link"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  Invite Link
                </button>
                { (isTeacher || user.role === 'Admin') ? (
                  <button
                    onClick={handleEndMeeting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-650 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition shadow shadow-red-600/10"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    End Class Session
                  </button>
                ) : (
                  <button
                    onClick={leaveMeeting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Leave Meeting
                  </button>
                )}
              </div>
            </div>

            {/* Split Screen Container */}
            <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 items-stretch">
                      {/* Whiteboard workspace / Video Feed workspace (takes 2 or 3 cols on large screens depending on chat toggle) */}
              <div className={`${showMeetChat ? 'lg:col-span-2' : 'lg:col-span-3'} flex flex-col justify-between space-y-4 order-2 lg:order-1`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400">
                      {mainViewContent === 'whiteboard' ? 'Interactive Learning Board' : activeStreamName}
                    </h3>
                    {isBoardLocked && mainViewContent === 'whiteboard' && (
                      <span className="text-[9px] text-amber-500 font-semibold">🔒 LOCKED</span>
                    )}
                    {mainViewContent !== 'whiteboard' && (
                      <span className="text-[9px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Live Stream
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {mainViewContent === 'whiteboard' ? (
                      <>
                        <button
                          onClick={downloadWhiteboard}
                          className="flex items-center gap-1 text-[10px] bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 px-2 py-1 rounded font-bold uppercase tracking-wider transition"
                          title="Save whiteboard drawing as PNG image"
                        >
                          Save Image
                        </button>
                        {(isTeacher || user.role === 'Admin' || (isCR && crDetails.powers?.canPostAnnouncements)) && (
                          <button
                            onClick={clearWhiteboard}
                            className="flex items-center gap-1.5 text-[10px] bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition duration-150"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Clear Board
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setPinnedSocketId(null);
                        }}
                        className="flex items-center gap-1.5 text-[10px] bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition"
                        title="Return to the whiteboard view"
                      >
                        Show Whiteboard
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Viewport Slot */}
                <div className="bg-gray-950 border border-gray-800 rounded-2xl p-2 select-none relative shadow-2xl aspect-[16/10] max-h-[500px] flex items-center justify-center overflow-hidden">
                  {mainViewContent === 'whiteboard' ? (
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={500}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className={`w-full h-full bg-gray-900 rounded-xl cursor-crosshair touch-none ${showGrid ? 'canvas-grid-bg' : ''}`}
                    />
                  ) : (
                    /* Large Video Stream Player */
                    <div className="w-full h-full relative bg-gray-900 rounded-xl flex items-center justify-center">
                      {activeStreamToRender ? (
                        activeStreamIsMe ? (
                          <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-contain rounded-xl animate-fade-in"
                          />
                        ) : (
                          <RemoteVideo stream={activeStreamToRender} />
                        )
                      ) : (
                        <div className="text-center text-gray-400 text-xs">
                          <p>Waiting for video stream...</p>
                          <p className="text-[10px] text-gray-500 mt-1">Make sure the camera or screen share is active.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Controls Panel */}
                {mainViewContent === 'whiteboard' ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 bg-gray-900/30 border border-gray-800/80 rounded-2xl text-xs">
                    {/* Tools Palette (Color, Eraser, Grid) */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-extrabold text-gray-500 tracking-wider">Color:</span>
                        <div className="flex gap-1.5">
                          {[
                            { hex: '#6366f1', name: 'indigo' },
                            { hex: '#ef4444', name: 'red' },
                            { hex: '#10b981', name: 'emerald' },
                            { hex: '#f59e0b', name: 'amber' },
                            { hex: '#ffffff', name: 'white' }
                          ].map(color => (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => {
                                setBrushColor(color.hex);
                                setIsEraserMode(false);
                              }}
                              className={`w-5 h-5 rounded-full border transition duration-150 ${
                                brushColor === color.hex && !isEraserMode
                                  ? 'scale-125 border-white ring-2 ring-indigo-500/20' 
                                  : 'border-transparent hover:scale-110'
                              }`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            ></button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-l border-gray-800 pl-3">
                        <button
                          onClick={() => setIsEraserMode(!isEraserMode)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition ${
                            isEraserMode 
                              ? 'bg-amber-600/20 border-amber-500/30 text-amber-400' 
                              : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          Eraser Mode
                        </button>
                        <button
                          onClick={() => setShowGrid(!showGrid)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition ${
                            showGrid 
                              ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' 
                              : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          Grid Lines
                        </button>
                      </div>
                    </div>

                    {/* Brush size */}
                    <div className="flex items-center gap-3 flex-1 max-w-[200px] w-full">
                      <span className="text-[10px] uppercase font-extrabold text-gray-500 tracking-wider">Size:</span>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer h-1 bg-gray-800 rounded-lg"
                      />
                      <span className="font-mono text-xs text-gray-300 font-bold shrink-0">{brushSize}px</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-gray-900/30 border border-gray-800/80 rounded-2xl text-xs text-gray-400 text-center">
                    Whiteboard is currently hidden. Click <span className="text-white font-semibold">"Show Whiteboard"</span> above to return.
                  </div>
                )}
              </div>

              {/* Sidebar/Horizontal Video Feeds (takes 1 col on large screens) */}
              <div className="lg:col-span-1 flex flex-col justify-between gap-4 order-1 lg:order-2">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400">Class Attendees ({participants.length})</h3>
                    <span className="text-[10px] text-gray-500 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded font-mono">Live</span>
                  </div>
                  
                  {/* Container that acts as a horizontal slider on mobile, and vertical stack on desktop */}
                  <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-thin max-h-[360px] lg:overflow-y-auto">
                    {/* Active participants mapping */}
                    {participants.map((p) => {
                      const isMe = p.userId === user._id || p.socketId === socket.id;
                      const hasStream = isMe ? (localStream && (!isCamOff || isScreenSharing)) : (remoteStreams[p.socketId] && (!p.isCamOff || p.isScreenSharing));
                      
                      return (
                        <div key={p.socketId} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden aspect-video lg:w-full min-w-[180px] lg:min-w-0 relative flex flex-col justify-between p-3 shrink-0">
                          {hasStream ? (
                            isMe ? (
                              <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="absolute inset-0 w-full h-full object-cover rounded-xl animate-fade-in"
                              />
                            ) : (
                              <RemoteVideo stream={remoteStreams[p.socketId]} />
                            )
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950/20 to-purple-950/20">
                              <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 uppercase text-sm">
                                {p.username.substring(0, 2)}
                              </div>
                              <span className="text-[9px] text-gray-400 mt-2 font-medium">Camera Off</span>
                            </div>
                          )}

                          {/* Hand raised status overlay */}
                          {p.isHandRaised && (
                            <div className="absolute top-2.5 right-2.5 bg-amber-500 border border-amber-400/30 text-white rounded-full w-6 h-6 flex items-center justify-center shadow animate-bounce">
                              <span className="text-xs">✋</span>
                            </div>
                          )}

                          {/* Pin Toggle Button */}
                          <button
                            onClick={() => setPinnedSocketId(pinnedSocketId === p.socketId ? null : p.socketId)}
                            className={`absolute top-2.5 left-2.5 z-10 p-1 rounded text-[9px] font-bold transition flex items-center gap-1 ${
                              pinnedSocketId === p.socketId
                                ? 'bg-indigo-600 border border-indigo-500 text-white'
                                : 'bg-black/60 hover:bg-black/80 border border-gray-800 text-gray-300 hover:text-white'
                            }`}
                            title={pinnedSocketId === p.socketId ? 'Unpin Screen' : 'Pin Screen'}
                          >
                            📌 {pinnedSocketId === p.socketId ? 'Unpin' : 'Pin'}
                          </button>

                          <span className="absolute bottom-2 left-2 bg-black/75 border border-gray-800 text-white text-[9px] px-2 py-0.5 rounded backdrop-blur font-semibold flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${p.isCamOff ? 'bg-gray-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                            {isMe ? 'You' : `@${p.username}`} ({p.role})
                            {p.isMuted && <MicOff className="w-3 h-3 text-red-500 ml-1" />}
                          </span>
                        </div>
                      );
                    })}

                    {participants.length === 0 && (
                      <p className="text-xs text-gray-500 italic p-3 text-center w-full">No other attendees connected yet.</p>
                    )}
                  </div>
                </div>

                {/* Local Mic, Camera, Screen Share, Raise Hand, and Chat Toggles */}
                <div className="flex flex-wrap justify-center gap-2 p-3 bg-gray-900/30 border border-gray-800 rounded-2xl w-full">
                  <button
                    onClick={toggleMute}
                    className={`p-2.5 rounded-xl border transition duration-150 ${
                      isMuted 
                        ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20' 
                        : 'bg-gray-950 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900'
                    }`}
                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={toggleCam}
                    className={`p-2.5 rounded-xl border transition duration-150 ${
                      isCamOff 
                        ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20' 
                        : 'bg-gray-950 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900'
                    }`}
                    title={isCamOff ? 'Turn camera on' : 'Turn camera off'}
                  >
                    {isCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleToggleScreenShare}
                    className={`p-2.5 rounded-xl border transition duration-150 ${
                      isScreenSharing 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' 
                        : 'bg-gray-950 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900'
                    }`}
                    title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleRaiseHand}
                    className={`p-2.5 rounded-xl border transition duration-150 ${
                      isHandRaised 
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-500 hover:bg-amber-500/20' 
                        : 'bg-gray-950 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900'
                    }`}
                    title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                  >
                    <span className="text-sm leading-none">✋</span>
                  </button>
                  <button
                    onClick={() => setShowMeetChat(!showMeetChat)}
                    className={`p-2.5 rounded-xl border transition duration-150 ${
                      showMeetChat 
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20' 
                        : 'bg-gray-950 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900'
                    }`}
                    title="Toggle Meeting Chat"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Meet Chat Sidebar (takes 1 col on large screens when active) */}
              {showMeetChat && (
                <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between h-[380px] lg:h-auto order-3">
                  <div className="flex flex-col h-full justify-between space-y-3">
                    <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1.5 pb-2 border-b border-gray-800">
                      <Send className="w-3.5 h-3.5 text-indigo-400" />
                      Meeting Chat
                    </h3>
                    
                    {/* Chat Messages Log */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[220px] lg:max-h-[320px] pr-1 scrollbar-thin">
                      {meetMessages.map((msg, idx) => (
                        <div key={idx} className="text-xs bg-gray-950/40 p-2.5 rounded-xl border border-gray-800 space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-gray-400">
                            <span className="font-bold text-indigo-300">@{msg.sender}</span>
                            <span>{new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-gray-200">{msg.text}</p>
                        </div>
                      ))}
                      {meetMessages.length === 0 && (
                        <p className="text-xs text-gray-500 italic text-center py-8">No messages yet.</p>
                      )}
                    </div>

                    {/* Chat Input form */}
                    <form onSubmit={handleSendMeetMsg} className="flex gap-2 pt-2 border-t border-gray-800">
                      <input
                        type="text"
                        required
                        value={newMeetMsg}
                        onChange={(e) => setNewMeetMsg(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!newMeetMsg.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 transition text-xs font-semibold shrink-0"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </div>
      )}

      {selectedClassroom && !inMeeting && (
        /* --- Classroom Workspace --- */
        <div className="space-y-6">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-800">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  setSelectedClassroom(null);
                  fetchClassrooms();
                }}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition"
              >
                <ChevronLeft className="w-5 h-5 text-gray-300" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{selectedClassroom.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                    Code: {selectedClassroom.code}
                  </span>
                  <span className="text-sm text-gray-400">• Teacher: {selectedClassroom.teacher.username}</span>
                </div>
              </div>
            </div>
            
            {canShareNotes && (
              <div className="mt-4 sm:mt-0 flex gap-3">
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded-lg text-xs font-semibold text-gray-300 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share Existing Note
                </button>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition shadow-lg shadow-indigo-600/20"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload Lecture Notes
                </button>
              </div>
            )}
          </div>

          {/* Admin Banner */}
          {(user.role === 'Admin' || user.role === 'SubAdmin') && (
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 flex justify-between items-center text-xs animate-fade-in shadow-lg">
              <span className="text-indigo-400 font-bold tracking-wide uppercase flex items-center gap-1.5">
                🛡️ System Administrator Workspace Access
              </span>
              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold px-2.5 py-1 rounded">
                Classroom Code: {selectedClassroom.code}
              </span>
            </div>
          )}

          {/* Live Class Session Banner */}
          {selectedClassroom.meeting?.isActive ? (
            <div className="bg-gradient-to-r from-red-600/15 via-indigo-600/5 to-transparent border border-red-500/20 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                  Live Class Session in Progress!
                </h4>
                <p className="text-xs text-gray-400">Join the live interactive video meeting and collaborative whiteboard.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono bg-gray-900 border border-gray-800 text-gray-305 px-2.5 py-1 rounded">
                  Code: {selectedClassroom.meeting.code}
                </span>
                <button
                  onClick={handleJoinMeeting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition shadow-lg shadow-red-600/20"
                >
                  Join Live Class
                </button>
              </div>
            </div>
          ) : (
            (selectedClassroom.teacher._id === user._id || selectedClassroom.teacher === user._id || user.role === 'Admin') && (
              <div className="bg-indigo-950/10 border border-indigo-500/15 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    🎥 Launch Live Classroom Meeting
                  </h4>
                  <p className="text-xs text-gray-400">Start a live video class with an interactive whiteboard for your students.</p>
                </div>
                <button
                  onClick={handleStartMeeting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-lg shadow-indigo-600/20"
                >
                  Start Live Class
                </button>
              </div>
            )
          )}

          {/* Grid Layout workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Announcements Noticeboard */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass p-6 rounded-xl border border-gray-800 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-400" />
                  Notice Board
                </h3>

                {/* Announcement Creation Form */}
                {canPostAnnouncements ? (
                  <form onSubmit={handlePostAnnouncement} className="flex gap-2">
                    <input
                      type="text"
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="Post a notice or announcement to the class..."
                      className="flex-1 bg-gray-900/60 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading || !announcementText.trim()}
                      className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/40 text-indigo-400 rounded-lg text-sm font-semibold transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-gray-500 italic">Only teachers and authorized class representatives can post announcements.</p>
                )}

                {/* Announcements List */}
                <div className="space-y-6 mt-6 max-h-[600px] overflow-y-auto pr-2">
                  {selectedClassroom.announcements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No notices posted yet.
                    </div>
                  ) : (
                    selectedClassroom.announcements.map((ann) => (
                      <div key={ann._id} className="p-4 rounded-lg bg-gray-900/30 border border-gray-800 space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {ann.sender}
                          </span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ann.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-305 whitespace-pre-wrap">{ann.text}</p>
                        
                        {/* Comments section */}
                        <div className="border-t border-gray-900 pt-3 mt-2 space-y-2">
                          <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Comments</h4>
                          
                          {/* Comments List */}
                          <div className="space-y-1.5">
                            {ann.comments && ann.comments.length > 0 ? (
                              ann.comments.map((comm) => (
                                <div key={comm._id} className="flex justify-between items-start bg-gray-950/40 p-2.5 rounded-lg border border-gray-900 text-xs">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-400">{comm.sender}</p>
                                    <p className="text-gray-300 mt-0.5 leading-normal">{comm.text}</p>
                                    <span className="text-[8px] text-gray-600 mt-1 block">
                                      {new Date(comm.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  
                                  {canDeleteComments && (
                                    <button 
                                      onClick={() => handleDeleteComment(ann._id, comm._id)}
                                      className="p-1 text-gray-600 hover:text-red-400 transition"
                                      title="Delete Comment"
                                    >
                                      <Trash className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-gray-600 italic">No comments yet.</p>
                            )}
                          </div>

                          {/* Write Comment Form (Students only/allowed) */}
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentTextMap[ann._id] || ''}
                              onChange={(e) => setCommentTextMap({
                                ...commentTextMap,
                                [ann._id]: e.target.value
                              })}
                              className="flex-1 bg-gray-950 border border-gray-900 rounded px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-600"
                            />
                            <button
                              onClick={() => handleAddComment(ann._id)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition"
                            >
                              Comment
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Column: Files, Members, and CRs */}
            <div className="space-y-6">
              
              {/* Shared Files list */}
              <div className="glass p-6 rounded-xl border border-gray-800 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  Class Materials ({selectedClassroom.sharedNotes.length})
                </h3>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {selectedClassroom.sharedNotes.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No materials shared yet.
                    </div>
                  ) : (
                    selectedClassroom.sharedNotes.map((note) => (
                      <div key={note._id} className="p-3 rounded-lg bg-gray-900/30 border border-gray-800 flex items-center justify-between">
                        <div className="truncate pr-2">
                          <p className="text-sm font-semibold text-white truncate">{note.title}</p>
                          <p className="text-xs text-gray-500 truncate">By {note.uploader?.username || 'Teacher'} • {note.category}</p>
                        </div>
                        <a 
                          href={note.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 rounded transition font-medium"
                        >
                          View
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Members/Classlist roster */}
              <div className="glass p-6 rounded-xl border border-gray-800 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Class Roster ({selectedClassroom.students.length + 1})
                </h3>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                  {/* Teacher */}
                  <div className="p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <div>
                      <p className="text-sm font-bold text-white">{selectedClassroom.teacher.username}</p>
                      <p className="text-[10px] text-indigo-400 uppercase font-semibold">Teacher</p>
                    </div>
                  </div>

                  {/* Students */}
                  {selectedClassroom.students.map((student) => {
                    const isStudentCR = selectedClassroom.classRepresentatives?.some(
                      r => r.student._id === student._id || r.student === student._id
                    );
                    return (
                      <div key={student._id} className="p-2 rounded-lg bg-gray-900/20 border border-gray-800/60 flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-300">{student.username}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-medium">Student</p>
                          </div>
                        </div>
                        {isStudentCR && (
                          <span className="text-[8px] uppercase tracking-wider font-extrabold bg-amber-500/15 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded shadow">
                            Rep
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Class Representatives Management / View */}
              <div className="glass p-6 rounded-xl border border-gray-800 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UsersRound className="w-5 h-5 text-amber-500" />
                  Class Representatives
                </h3>

                {/* Display Current representatives */}
                <div className="space-y-4">
                  {selectedClassroom.classRepresentatives && selectedClassroom.classRepresentatives.length > 0 ? (
                    selectedClassroom.classRepresentatives.map((rep) => (
                      <div key={rep._id || rep.student._id} className="p-3 rounded-lg bg-gray-950/30 border border-gray-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">@{rep.student?.username || 'Student'}</span>
                          {isTeacher && (
                            <button
                              onClick={() => handleRevokeCR(rep.student._id || rep.student)}
                              className="text-[10px] text-red-500 hover:text-red-400 font-semibold"
                            >
                              Revoke Rep
                            </button>
                          )}
                        </div>

                        {/* Power Toggles */}
                        <div className="space-y-1 bg-gray-950/60 p-2 rounded border border-gray-900 text-[10px] text-gray-400">
                          <p className="font-bold mb-1 uppercase tracking-wider text-gray-500">Privileges</p>
                          
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isTeacher}
                              checked={rep.powers?.canPostAnnouncements || false}
                              onChange={(e) => handleUpdateCRPowers(rep.student._id || rep.student, {
                                ...rep.powers,
                                canPostAnnouncements: e.target.checked
                              })}
                              className="rounded border-gray-800 bg-gray-900 text-indigo-600 focus:ring-0 w-3 h-3"
                            />
                            <span>Post Announcements</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isTeacher}
                              checked={rep.powers?.canShareNotes || false}
                              onChange={(e) => handleUpdateCRPowers(rep.student._id || rep.student, {
                                ...rep.powers,
                                canShareNotes: e.target.checked
                              })}
                              className="rounded border-gray-800 bg-gray-900 text-indigo-600 focus:ring-0 w-3 h-3"
                            />
                            <span>Share Note Materials</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!isTeacher}
                              checked={rep.powers?.canDeleteComments || false}
                              onChange={(e) => handleUpdateCRPowers(rep.student._id || rep.student, {
                                ...rep.powers,
                                canDeleteComments: e.target.checked
                              })}
                              className="rounded border-gray-800 bg-gray-900 text-indigo-600 focus:ring-0 w-3 h-3"
                            />
                            <span>Moderate Announcement Comments</span>
                          </label>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 italic">No class representatives assigned.</p>
                  )}
                </div>

                {/* Assign Form (only teacher) */}
                {isTeacher && selectedClassroom.classRepresentatives?.length < 2 && (
                  <form onSubmit={handleAssignCR} className="border-t border-gray-900 pt-3 space-y-3">
                    <p className="text-[10px] uppercase font-bold text-gray-500">Designate Class Representative</p>
                    <div className="space-y-2">
                      <select
                        required
                        value={crStudentId}
                        onChange={(e) => setCrStudentId(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-600"
                      >
                        <option value="">-- Choose Student --</option>
                        {selectedClassroom.students
                          .filter(s => !selectedClassroom.classRepresentatives?.some(rep => (rep.student._id || rep.student) === s._id))
                          .map(student => (
                            <option key={student._id} value={student._id}>{student.username}</option>
                          ))
                        }
                      </select>

                      {/* Powers settings */}
                      <div className="space-y-1 p-2 bg-gray-950 rounded border border-gray-900 text-[10px] text-gray-400">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={crPowers.canPostAnnouncements}
                            onChange={(e) => setCrPowers({ ...crPowers, canPostAnnouncements: e.target.checked })}
                            className="rounded border-gray-800 bg-gray-900 text-indigo-600 focus:ring-0 w-3 h-3"
                          />
                          <span>Power: Post Announcements</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={crPowers.canShareNotes}
                            onChange={(e) => setCrPowers({ ...crPowers, canShareNotes: e.target.checked })}
                            className="rounded border-gray-800 bg-gray-900 text-indigo-600 focus:ring-0 w-3 h-3"
                          />
                          <span>Power: Share Notes</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={crPowers.canDeleteComments}
                            onChange={(e) => setCrPowers({ ...crPowers, canDeleteComments: e.target.checked })}
                            className="rounded border-gray-800 bg-gray-900 text-indigo-600 focus:ring-0 w-3 h-3"
                          />
                          <span>Power: Delete Comments</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading || !crStudentId}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition"
                      >
                        Assign Representative
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {!selectedClassroom && (
        /* --- Classrooms Dashboard Grid --- */
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Classrooms</h1>
              <p className="text-gray-400 text-sm mt-1">Connect with your teachers and study peers inside private class spaces.</p>
            </div>
            
            <div className="flex items-center gap-3">
              {(user.role === 'Teacher' || user.role === 'Admin' || user.role === 'SubAdmin') && (
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  Create Class
                </button>
              )}
              <button 
                onClick={() => setShowJoinModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700/80 rounded-lg text-sm font-semibold transition"
              >
                <LogIn className="w-4 h-4" />
                Join Class
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-indigo-400 font-medium">
              Loading classroom environments...
            </div>
          ) : classrooms.length === 0 ? (
            <div className="glass p-12 rounded-2xl border border-gray-800 text-center max-w-xl mx-auto space-y-4">
              <Users className="w-12 h-12 text-gray-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Classrooms Yet</h3>
              <p className="text-sm text-gray-400">
                You have not joined or created any classroom workspaces. Join a classroom using a code word provided by your teacher.
              </p>
              <button 
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
              >
                Join Class Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classrooms.map((room) => (
                <div 
                  key={room._id} 
                  onClick={() => fetchClassroomDetails(room._id)}
                  className="glass p-6 rounded-xl border border-gray-800 hover:border-gray-700 hover:bg-gray-800/10 cursor-pointer transition duration-200 flex flex-col justify-between h-48 group"
                >
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">{room.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 uppercase font-semibold tracking-wider">
                      Code: <span className="text-gray-350 font-mono font-bold">{room.code}</span>
                    </p>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-800/60 pt-4 mt-4">
                    <span className="text-xs text-gray-400">Teacher: {room.teacher?.username}</span>
                    <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                      {room.students?.length || 0} Students
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Create Classroom Modal --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass max-w-md w-full p-6 rounded-xl border border-gray-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create a New Classroom</h3>
            <form onSubmit={handleCreateClassroom} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase">Subject/Class Name</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Calculus II, Intro to Python"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-[10px] text-gray-500 italic">Classroom codes are generated automatically by the system and match case-sensitively.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-semibold transition"
                >
                  {actionLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Join Classroom Modal --- */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass max-w-md w-full p-6 rounded-xl border border-gray-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Join a Classroom</h3>
            <form onSubmit={handleJoinClassroom} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase">Classroom Code Word</label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter the case-sensitive code (e.g. aB1cD2)..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-semibold transition"
                >
                  {actionLoading ? 'Joining...' : 'Join Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Share Existing Note Modal --- */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass max-w-md w-full p-6 rounded-xl border border-gray-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Share Study Note</h3>
            <form onSubmit={handleShareNote} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase">Choose note to share</label>
                <select
                  required
                  value={selectedNoteId}
                  onChange={(e) => setSelectedNoteId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select a Study Note --</option>
                  {myNotes.map((note) => (
                    <option key={note._id} value={note._id}>{note.title} ({note.category})</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-gray-500 italic">Sharing notes will link and isolate them to this classroom workspace.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedNoteId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-semibold transition"
                >
                  Share Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Upload Classroom Note Material Modal --- */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass max-w-md w-full p-6 rounded-xl border border-gray-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Upload Note Material</h3>
            <form onSubmit={handleUploadMaterial} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase">Material Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Lecture 5: Derivatives, Syllabus"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase">Description</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Briefly describe the contents of this file..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 h-20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="General">General</option>
                  <option value="Lecture Notes">Lecture Notes</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Exam Prep">Exam Prep</option>
                  <option value="Syllabus">Syllabus</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase">Upload File</label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none"
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.xlsx,.xls,.txt,.pptx,.ppt"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !uploadFile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-semibold transition"
                >
                  {actionLoading ? 'Uploading...' : 'Upload Notes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Classrooms;
