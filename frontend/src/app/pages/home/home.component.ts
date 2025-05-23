import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, switchMap, takeUntil, Subject, catchError, of } from 'rxjs';
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
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private refreshTrigger = new BehaviorSubject<void>(undefined);
  
  // Loading states
  isLoading = false;
  showValidation = false;

  // Form fields
  title = '';
  description = '';
  status: 'Active' | 'Completed' | 'Pending' = 'Active';
  priority: 'Low' | 'Medium' | 'High' = 'Low';
  
  // Edit mode
  isEditMode = false;
  editingTodoId: string | null = null;

  // Filter and stats
  currentFilter: 'all' | 'Active' | 'Completed' | 'Pending' = 'all';
  totalTodos = 0;
  completedTodos = 0;
  pendingTodos = 0;

  filters = [
    { label: 'All', value: 'all' as const },
    { label: 'Active', value: 'Active' as const },
    { label: 'Pending', value: 'Pending' as const },
    { label: 'Completed', value: 'Completed' as const }
  ];

  // Observables
  todos$: Observable<Todo[]> = this.refreshTrigger.pipe(
    switchMap(() => this.todoService.getTodos()),
    catchError(error => {
      console.error('Error loading todos:', error);
      return of([]);
    }),
    takeUntil(this.destroy$)
  );

  filteredTodos$: Observable<Todo[]> = this.todos$.pipe(
    switchMap(todos => {
      this.updateStats(todos);
      const filtered = this.currentFilter === 'all' 
        ? todos 
        : todos.filter(todo => todo.status === this.currentFilter);
      return of(this.sortTodos(filtered));
    })
  );

  constructor(
    private todoService: TodoService,
    private auth: Auth
  ) {
    console.log('HomeComponent constructor called');
    console.log('TodoService:', this.todoService);
    console.log('Auth:', this.auth);
  }

  ngOnInit(): void {
    console.log('HomeComponent initialized');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addTodo(): void {
    this.showValidation = true;
    
    const user = this.auth.currentUser;
    if (!user) {
      alert('You must be logged in to add todos.');
      return;
    }

    if (!this.title.trim()) {
      return;
    }

    this.isLoading = true;
    
    if (this.isEditMode && this.editingTodoId) {
      // Update existing todo
      const updatedTodo = {
        title: this.title.trim(),
        description: this.description.trim(),
        status: this.status,
        priority: this.priority,
        updatedAt: new Date()
      };

      console.log('Updating todo:', this.editingTodoId, updatedTodo);
//@ts-ignore
      this.todoService.updateTodo(this.editingTodoId, updatedTodo).subscribe({
        next: (result) => {
          console.log('Todo updated successfully:', result);
          this.clearForm();
          this.refreshTrigger.next();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error updating todo:', error);
          alert('Failed to update todo. Please try again.');
          this.isLoading = false;
        }
      });
    } else {
      // Add new todo
      const todo = {
        title: this.title.trim(),
        description: this.description.trim(),
        status: this.status,
        priority: this.priority,
        createdAt: new Date()
      };

      console.log('Adding todo:', todo);

      this.todoService.addTodo(todo).subscribe({
        next: (result) => {
          console.log('Todo added successfully:', result);
          this.clearForm();
          this.refreshTrigger.next();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error adding todo:', error);
          alert('Failed to add todo. Please try again.');
          this.isLoading = false;
        }
      });
    }
  }

  deleteTodo(id: string): void {
    if (!id || !confirm('Are you sure you want to delete this todo?')) return;
    
    console.log('Deleting todo:', id);
    
    this.todoService.deleteTodo(id).subscribe({
      next: () => {
        console.log('Todo deleted successfully');
        this.refreshTrigger.next();
      },
      error: (error) => {
        console.error('Error deleting todo:', error);
        alert('Failed to delete todo. Please try again.');
      }
    });
  }

  toggleTodoStatus(todo: Todo): void {
    const newStatus = todo.status === 'Completed' ? 'Active' : 'Completed';
    const updatedTodo = { ...todo, status: newStatus };
    //@ts-ignore
    this.todoService.updateTodo(todo.id!, updatedTodo).subscribe({
      next: () => {
        console.log('Todo status updated successfully');
        this.refreshTrigger.next();
      },
      error: (error) => {
        console.error('Error updating todo status:', error);
        alert('Failed to update todo status. Please try again.');
      }
    });
  }

  editTodo(todo: Todo): void {
    // Pre-fill form with todo data for editing
    this.title = todo.title;
    this.description = todo.description || '';
    this.status = todo.status;
    this.priority = todo.priority;
    
    // Set edit mode
    this.isEditMode = true;
    this.editingTodoId = todo.id!;
    
    // Scroll to top to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.clearForm();
  }

  clearForm(): void {
    this.title = '';
    this.description = '';
    this.status = 'Active';
    this.priority = 'Low';
    this.showValidation = false;
    this.isEditMode = false;
    this.editingTodoId = null;
  }

  setFilter(filter: 'all' | 'Active' | 'Completed' | 'Pending'): void {
    this.currentFilter = filter;
    // Trigger filteredTodos$ to update
    this.refreshTrigger.next();
  }

  getFilterButtonClass(filter: string): string {
    const baseClass = 'transition-all duration-200 ';
    return this.currentFilter === filter
      ? baseClass + 'bg-purple-600 text-white shadow-lg'
      : baseClass + 'bg-gray-700 text-gray-300 hover:bg-gray-600';
  }

  getFilterCount(filter: 'all' | 'Active' | 'Completed' | 'Pending'): number {
    if (filter === 'all') return this.totalTodos;
    if (filter === 'Completed') return this.completedTodos;
    if (filter === 'Pending') return this.pendingTodos;
    return this.totalTodos - this.completedTodos - this.pendingTodos; // Active
  }

  getStatusBadgeClass(status: string): string {
    const baseClass = 'bg-opacity-20 border ';
    switch (status) {
      case 'Completed': return baseClass + 'bg-green-500 text-green-300 border-green-500';
      case 'Pending': return baseClass + 'bg-yellow-500 text-yellow-300 border-yellow-500';
      case 'Active': return baseClass + 'bg-blue-500 text-blue-300 border-blue-500';
      default: return baseClass + 'bg-gray-500 text-gray-300 border-gray-500';
    }
  }

  getPriorityBadgeClass(priority: string): string {
    const baseClass = 'bg-opacity-20 border ';
    switch (priority) {
      case 'High': return baseClass + 'bg-red-500 text-red-300 border-red-500';
      case 'Medium': return baseClass + 'bg-yellow-500 text-yellow-300 border-yellow-500';
      case 'Low': return baseClass + 'bg-green-500 text-green-300 border-green-500';
      default: return baseClass + 'bg-gray-500 text-gray-300 border-gray-500';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Completed': return '✅';
      case 'Pending': return '⏳';
      case 'Active': return '🔵';
      default: return '⚪';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'High': return '🔴';
      case 'Medium': return '🟡';
      case 'Low': return '🟢';
      default: return '⚪';
    }
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  trackByTodoId(index: number, todo: Todo): string {
    return todo.id || index.toString();
  }

  private updateStats(todos: Todo[]): void {
    this.totalTodos = todos.length;
    this.completedTodos = todos.filter(t => t.status === 'Completed').length;
    this.pendingTodos = todos.filter(t => t.status === 'Pending').length;
  }

  private sortTodos(todos: Todo[]): Todo[] {
    return todos.sort((a, b) => {
      // Sort by priority first (High > Medium > Low)
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by status (Active > Pending > Completed)
      const statusOrder = { 'Active': 3, 'Pending': 2, 'Completed': 1 };
      const statusDiff = statusOrder[b.status] - statusOrder[a.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Finally by creation date (newest first)
      if (a.createdAt && b.createdAt) {
        //@ts-ignore
        const aDate = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        //@ts-ignore
        const bDate = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      }
      
      return 0;
    });
  }
}