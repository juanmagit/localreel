import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { UserSelect } from '../components/UserSelect';
import { useAppOutletContext } from '../context/AppContext';
import { User } from '../types/media';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { onSelectUser } = useAppOutletContext();

  const handleUserSelect = (user: User) => {
    onSelectUser(user);
    navigate({ to: '/' });
  };

  return <UserSelect onSelectUser={handleUserSelect} />;
};
