import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, switchMap } from 'rxjs';
import { TodoService } from '../../services/todo.service';
import { Auth } from '@angular/fire/auth';
import { Todo } from '../../services/todo.model';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [CommonModule, FormsModule],
})
export class HomeComponent implements OnInit {
  
  // Use constructor injection instead of inject()
  constructor(
    private todoService: TodoService,
    private auth: Auth
  ) {
    console.log('HomeComponent constructor called');
    console.log('TodoService:', this.todoService);
    console.log('Auth:', this.auth);
  }

  // Use a subject to trigger refresh
  private refreshTrigger = new BehaviorSubject<void>(undefined);
  
  todos$: Observable<Todo[]> = this.refreshTrigger.pipe(
    switchMap(() => {
      console.log('Loading todos...');
      return this.todoService.getTodos();
    })
  );

  // Form fields
  title = '';
  description = '';
  status: 'Active' | 'Completed' | 'Pending' = 'Active';
  priority: 'Low' | 'Medium' | 'High' = 'Low';

  ngOnInit(): void {
    console.log('HomeComponent ngOnInit called');
  }

  addTodo() {
    const user = this.auth.currentUser;
    if (!user) {
      alert('You must be logged in to add todos.');
      return;
    }

    if (!this.title.trim()) {
      alert('Title is required.');
      return;
    }

    const todo = {
      title: this.title.trim(),
      description: this.description.trim(),
      status: this.status,
      priority: this.priority,
    };

    console.log('Adding todo:', todo);

    this.todoService.addTodo(todo).subscribe({
      next: (result) => {
        console.log('Todo added successfully:', result);
        // Clear inputs
        this.title = '';
        this.description = '';
        this.status = 'Active';
        this.priority = 'Low';
        
        // Refresh the todo list
        this.refreshTrigger.next();
      },
      error: (error) => {
        console.error('Error adding todo:', error);
        alert('Failed to add todo. Please try again.');
      }
    });
  }

  deleteTodo(id: string) {
    if (!id) return;
    
    console.log('Deleting todo:', id);
    
    this.todoService.deleteTodo(id).subscribe({
      next: () => {
        console.log('Todo deleted successfully');
        // Refresh the todo list
        this.refreshTrigger.next();
      },
      error: (error) => {
        console.error('Error deleting todo:', error);
        alert('Failed to delete todo. Please try again.');
      }
    });
  }
}