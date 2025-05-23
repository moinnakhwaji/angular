// todo.service.ts (Debug version)
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { Todo } from './todo.model';
import { Auth } from '@angular/fire/auth';

@Injectable({ 
  providedIn: 'root' 
})
export class TodoService {
  private baseUrl = 'http://localhost:3000/api/todos';

  // Use constructor injection instead of inject()
  constructor(
    private http: HttpClient,
    private auth: Auth
  ) {
    console.log('TodoService constructor called');
    console.log('HttpClient:', this.http);
    console.log('Auth:', this.auth);
  }

  private getAuthHeaders(): Observable<HttpHeaders> {
    return from(this.createHeaders());
  }

  private async createHeaders(): Promise<HttpHeaders> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    const token = await user.getIdToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getTodos(): Observable<Todo[]> {
    console.log('getTodos called, HttpClient available:', !!this.http);
    return this.getAuthHeaders().pipe(
      switchMap(headers => {
        console.log('Making HTTP request...');
        return this.http.get<Todo[]>(this.baseUrl, { headers });
      })
    );
  }

  addTodo(todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'email' | 'uid'>): Observable<Todo> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.post<Todo>(this.baseUrl, todo, { headers }))
    );
  }

  deleteTodo(id: string): Observable<any> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.delete(`${this.baseUrl}/${id}`, { headers }))
    );
  }
}