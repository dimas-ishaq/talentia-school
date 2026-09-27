// server/utils/dummy-users.ts

export interface DummyUser {
  id: string
  email: string
  password: string  // plain text — hanya untuk dummy!
  name: string
  role: 'admin' | 'teacher' | 'student' | 'parent'
}

export const dummyUsers: DummyUser[] = [
  {
    id: '1',
    email: 'admin@sekolah.com',
    password: 'password123',
    name: 'Budi Admin',
    role: 'admin',
  },
  {
    id: '2',
    email: 'guru@sekolah.com',
    password: 'password123',
    name: 'Ani Guru',
    role: 'teacher',
  },
  {
    id: '3',
    email: 'siswa@sekolah.com',
    password: 'password123',
    name: 'Citra Siswa',
    role: 'student',
  },
  {
    id: '4',
    email: 'ortu@sekolah.com',
    password: 'password123',
    name: 'Dedi Orang Tua',
    role: 'parent',
  },
]

export function findUserByEmail(email: string): DummyUser | undefined {
  return dummyUsers.find(u => u.email.toLowerCase() === email.toLowerCase())
}