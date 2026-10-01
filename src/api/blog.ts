import { supabase } from "../lib/supabaseClient";
import type { BlogPost } from "../types/blog";

export async function fetchPosts(): Promise<BlogPost[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as BlogPost[];
}

export async function fetchPostById(id: string): Promise<BlogPost | null> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as BlogPost;
}

export async function verifyPassword(password: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('verify_blog_password', {
        input_password: password,
    });
    if (error) return false;
    return data === true;
}

export async function createPost(post: {
    author: string; title: string; content: string; password: string;
}): Promise<{ success: boolean; id?: string; message?: string}> {
    const { data, error } = await supabase.rpc('create_post', {
        input_author: post.author,
        input_title: post.title,
        input_content: post.content,
        input_password: post.password
    });

    if (error) return { success: false, message: error.message};
    return { success: true, id: data as string };
}

export async function updatePost(post: {
    id: string; author: string; title: string; content: string; password: string;
}): Promise<{ success: boolean; message?: string }> {
  const { error } = await supabase.rpc('update_post', {
    input_id: post.id,
    input_author: post.author,
    input_title: post.title,
    input_content: post.content,
    input_password: post.password,
  });

  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function deletePost(
  id: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  const { error } = await supabase.rpc('delete_post', {
    input_id: id,
    input_password: password,
  });

  if (error) return { success: false, message: error.message };
  return { success: true };
}