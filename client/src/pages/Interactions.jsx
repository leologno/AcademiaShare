import React, { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle, Send, User, ChevronRight, BookOpen, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Interactions = () => {
  const { user, socket } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [notes, setNotes] = useState([]);

  // Form states (Student)
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedNote, setSelectedNote] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Answer states (Teacher)
  const [activeAnswerId, setActiveAnswerId] = useState(null);
  const [answerText, setAnswerText] = useState('');

  const fetchQuestions = async () => {
    try {
      const { data } = await api.get('/interaction');
      setQuestions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMeta = async () => {
    try {
      if (user.role === 'Student') {
        const teachersRes = await api.get('/auth/teachers');
        setTeachers(teachersRes.data);
        if (teachersRes.data.length > 0) {
          setSelectedTeacher(teachersRes.data[0]._id);
        }

        const notesRes = await api.get('/notes');
        setNotes(notesRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchQuestions();
      fetchMeta();
    }
  }, [user]);

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!questionText.trim()) return;

    try {
      const { data } = await api.post('/interaction', {
        teacherId: selectedTeacher,
        noteId: selectedNote || null,
        questionText,
      });

      // Socket trigger to alert teacher in real-time
      if (socket) {
        socket.emit('qa:question', {
          studentId: user._id,
          teacherId: selectedTeacher,
          questionText,
        });
      }

      setQuestionText('');
      setSuccess('Question sent to teacher successfully!');
      fetchQuestions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send question');
    }
  };

  const handleAnswerSubmit = async (e, questionId, studentId) => {
    e.preventDefault();
    if (!answerText.trim()) return;

    try {
      await api.put(`/interaction/${questionId}/answer`, { answerText });
      
      // Socket trigger to alert student in real-time
      if (socket) {
        socket.emit('qa:answer', {
          studentId,
          teacherId: user._id,
          answerText,
        });
      }

      setAnswerText('');
      setActiveAnswerId(null);
      fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (questionId) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/interaction/${questionId}/resolve`);
      setSuccess('Question marked as resolved successfully!');
      fetchQuestions();
    } catch (err) {
      console.error(err);
      setError('Failed to mark question resolved.');
    }
  };

  const handleUpvote = async (questionId) => {
    try {
      await api.post(`/interaction/${questionId}/upvote`);
      fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-gray-200">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Q&A Interactions</h1>
        <p className="text-gray-400 text-sm">Direct teacher assistance and lecture notes validation</p>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs max-w-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs max-w-xl">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side Panel */}
        <div className="space-y-6 order-last lg:order-first">
          {user.role === 'Student' ? (
            <div className="glass rounded-2xl p-6 border border-gray-800 space-y-5 animate-fade-in">
              <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5 border-b border-gray-900 pb-3">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                Ask a Teacher
              </h3>

              {teachers.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No teachers registered on the platform yet.</p>
              ) : (
                <form onSubmit={handleAskQuestion} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Select Teacher</label>
                    <select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    >
                      {teachers.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.username} ({t.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Attach Study Note (Optional)</label>
                    <select
                      value={selectedNote}
                      onChange={(e) => setSelectedNote(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    >
                      <option value="">-- No Attachment --</option>
                      {notes.map((n) => (
                        <option key={n._id} value={n._id}>
                          {n.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Your Question</label>
                    <textarea
                      required
                      rows="4"
                      placeholder="Type your question or request clarification here..."
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-250 placeholder-gray-655 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow shadow-indigo-650/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Query
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="glass rounded-2xl p-6 border border-gray-800 space-y-4">
              <h3 className="text-sm font-bold text-gray-200 border-b border-gray-900 pb-3">Q&A Guidelines</h3>
              <div className="text-xs text-gray-400 space-y-3 leading-relaxed">
                <p>💡 Live updates: Questions and answers sync using Socket.IO events.</p>
                <p>📚 Attachment links: Click the note indicators on queries to inspect associated lectures.</p>
                <p>🎓 Responsibility: Teachers can view only questions directed specifically to their accounts.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Pane - Questions Stream */}
        <div className="lg:col-span-2 space-y-4 order-first lg:order-none">
          <h3 className="text-xs uppercase font-bold tracking-wider text-gray-500 mb-3">Active Question Feed</h3>

          {questions.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center text-gray-500 border border-gray-900">
              <HelpCircle className="w-12 h-12 text-gray-800 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-400">No questions recorded</h3>
              <p className="text-xs text-gray-650 mt-1">Submit a question or check back later!</p>
            </div>
          ) : (
            questions.map((q) => (
              <div key={q._id} className="glass rounded-2xl p-5 border border-gray-850 space-y-4 shadow-sm relative overflow-hidden">
                {/* Status indicator */}
                <div className="absolute top-0 right-0 h-1.5 w-24 bg-gradient-to-l from-indigo-500/20 to-transparent"></div>

                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                      <span className="font-semibold text-gray-450">Asked by {q.student?.username}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                      <span>Directed to {q.teacher?.username}</span>
                    </p>
                    <p className="text-xs text-gray-200 leading-relaxed font-medium">Q: {q.question}</p>
                  </div>

                  {/* Question Status Badge */}
                  {q.status === 'Resolved' ? (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 shadow animate-fade-in">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolved
                    </span>
                  ) : q.status === 'Answered' ? (
                    <span className="flex items-center gap-1 text-[10px] bg-blue-500/15 border border-blue-500/25 text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 shadow animate-fade-in">
                      <Clock className="w-3.5 h-3.5" />
                      Answered
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] bg-amber-500/15 border border-amber-500/25 text-amber-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 shadow">
                      <Clock className="w-3.5 h-3.5" />
                      Pending
                    </span>
                  )}
                </div>

                {/* Attachment note */}
                {q.note && (
                  <div className="inline-flex items-center gap-1 text-[10px] bg-gray-900 border border-gray-850 px-2 py-1 rounded text-gray-450">
                    <BookOpen className="w-3 h-3 text-indigo-400" />
                    <span>Attached note: <span className="text-gray-300 font-semibold">{q.note.title}</span></span>
                  </div>
                )}

                {/* Answer box */}
                {q.answer && (
                  <div className="bg-indigo-650/5 border border-indigo-500/10 rounded-xl p-4 space-y-1.5">
                    <p className="text-[10px] uppercase font-bold text-indigo-455 tracking-wider">Teacher Answer</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{q.answer}</p>
                  </div>
                )}

                {/* Provide Answer Form (Teacher only) */}
                {user.role === 'Teacher' && q.status !== 'Resolved' && !q.answer && (
                  <div className="border-t border-gray-900 pt-3">
                    {activeAnswerId === q._id ? (
                      <form onSubmit={(e) => handleAnswerSubmit(e, q._id, q.student?._id)} className="space-y-3">
                        <textarea
                          required
                          rows="2"
                          placeholder="Type your answer..."
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-250 placeholder-gray-655 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition resize-none"
                        ></textarea>
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAnswerId(null);
                              setAnswerText('');
                            }}
                            className="px-3 py-1.5 text-gray-450 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition"
                          >
                            Submit Answer
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveAnswerId(q._id);
                          setAnswerText('');
                        }}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                      >
                        Provide Answer
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Action footer (Upvotes and Mark Resolved) */}
                <div className="flex justify-between items-center border-t border-gray-900/60 pt-3">
                  <button
                    onClick={() => handleUpvote(q._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition ${
                      q.upvotes?.includes(user._id)
                        ? 'bg-indigo-600/15 border-indigo-500/25 text-indigo-400'
                        : 'bg-gray-900 border border-gray-850 text-gray-400 hover:text-white'
                    }`}
                  >
                    👍 Helpful ({q.upvotes?.length || 0})
                  </button>

                  {/* Mark as Resolved (Student only, when Answered) */}
                  {user.role === 'Student' && q.status === 'Answered' && (q.student?._id === user._id || q.student === user._id) && (
                    <button
                      onClick={() => handleResolve(q._id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] transition shadow shadow-emerald-650/10"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Interactions;
