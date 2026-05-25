import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { AdminDashboard } from './dashboard/AdminDashboard';
import { TeacherDashboard } from './dashboard/TeacherDashboard';
import { StudentDashboard } from './dashboard/StudentDashboard';

export const WebDashboard: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) return null;

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'TEACHER':
      return <TeacherDashboard />;
    case 'STUDENT':
    default:
      return <StudentDashboard />;
  }
};
