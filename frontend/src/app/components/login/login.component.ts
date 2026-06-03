import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  hidePassword = true;

  demoAccounts = [
    { label: 'Manager', username: 'manager1', password: 'Manager@123' },
    { label: 'Analyst 1', username: 'analyst1', password: 'Analyst@123' },
    { label: 'Analyst 2', username: 'analyst2', password: 'Analyst@123' },
    { label: 'Borrower (B001)', username: 'borrower_b001', password: 'Borrower@123' },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  fillDemo(acc: { username: string; password: string }) {
    this.loginForm.patchValue(acc);
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.loading = true;
    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Login failed', 'Close', { duration: 3000 });
      }
    });
  }
}
