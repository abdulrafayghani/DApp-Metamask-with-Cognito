 
import React, { useState, useEffect, useContext } from 'react';
import { AwsContext } from '../context/AwsProvider';
import { AuthContext } from '../context/AuthProvider';

function Dashboard() {
  const { awsClient } = React.useContext(AwsContext);
  const [state, setState] = useState({ data: '' });
  const { authState, dispatch } = useContext(AuthContext);

  const logout = () => {
    dispatch({
        type: 'LOGOUT',
    });
  }
  
  return (
    <div className='home'>
      <div className='content'>
        <h1>Dashboard</h1>
        <button onClick={logout}>logout</button>
      </div>
    </div>
  );
}

export default Dashboard;