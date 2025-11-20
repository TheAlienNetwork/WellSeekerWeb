import LoginForm from '../LoginForm';

export default function LoginFormExample() {
  return (
    <LoginForm onLogin={(email, password) => {
      console.log('Login triggered with:', email, password);
    }} />
  );
}
