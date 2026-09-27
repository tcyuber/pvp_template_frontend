import { Route, Routes } from 'react-router-dom';
import { AccountList } from './pages/accountList';  
import { Computer } from './pages/computer';
import { Home } from './pages/home';
import { LogIn } from './pages/logIn';
import { Menu } from './pages/menu';
import { PlayerMatch } from './pages/playerMatch';
import { ProfilePage } from './pages/profilePage';
import { SignUp } from './pages/signUp';

function App() {
  return (
    <main className="page">
    <Routes>
      <Route index element={<Home />} />
      <Route path="/account-list" element={<AccountList />} />
      <Route path="/sign-up" element={<SignUp />} /> 
      <Route path="/log-in" element={<LogIn />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/computer" element={<Computer />} />
      <Route path="/player-match" element={<PlayerMatch />} />
      <Route path="/profile-page" element={<ProfilePage />} />
    </Routes>
    </main>
  );
}



export default App;
