import { forwardRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

const TurnstileCaptcha = forwardRef(({ onVerify }, ref) => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      onSuccess={(token) => {
        onVerify(token); // devuelve el token al componente padre
      }}
    />
  );
});

export default TurnstileCaptcha;
