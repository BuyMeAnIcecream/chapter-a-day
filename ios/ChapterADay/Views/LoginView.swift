//
//  LoginView.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import SwiftUI

struct LoginView: View {
    @State private var viewModel = LoginViewModel()
    let onAuthSuccess: (AuthResponse) -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            VStack(spacing: 8) {
                Text("Chapter a Day")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text(viewModel.mode == .login 
                     ? "Log in to get today's chapter"
                     : "Create an account to start your daily journey")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            VStack(spacing: 16) {
                TextField("Username", text: $viewModel.username)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                
                SecureField("Password", text: $viewModel.password)
                    .textFieldStyle(.roundedBorder)
                
                if let error = viewModel.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                
                Button(action: {
                    Task {
                        if let auth = await viewModel.submit() {
                            onAuthSuccess(auth)
                        }
                    }
                }) {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text(viewModel.mode == .login ? "Log in" : "Create account")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isLoading || viewModel.username.isEmpty || viewModel.password.isEmpty)
            }
            .padding(.horizontal)
            
            Button(action: {
                viewModel.toggleMode()
            }) {
                Text(viewModel.mode == .login 
                     ? "Need an account? Register"
                     : "Already have an account? Log in")
                    .font(.caption)
                    .foregroundColor(.blue)
            }
            
            Spacer()
        }
        .padding()
    }
}

#Preview {
    LoginView { _ in }
}
