// Type declarations for Deno runtime globals and esm.sh URL imports used by Supabase Edge Functions

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  [key: string]: any;
};

declare module 'https://esm.sh/@supabase/supabase-js@2.43.4' {
  export * from '@supabase/supabase-js';
}

declare module 'https://esm.sh/*' {
  const content: any;
  export default content;
  export const createClient: any;
}
