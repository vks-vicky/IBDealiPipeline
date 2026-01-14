package org.example.ibpipeline.exception;

import org.example.ibpipeline.common.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /* BAD REQUEST (400) */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse> handleBadRequest(BadRequestException e) {
        return buildResponse(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    /* RESOURCE NOT FOUND (404) */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse> handleNotFound(ResourceNotFoundException e) {
        return buildResponse(HttpStatus.NOT_FOUND, e.getMessage());
    }

    /* VALIDATION ERRORS (400 )*/
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse> handelValidation(MethodArgumentNotValidException e) {

        String message = e.getBindingResult().getFieldErrors().stream().findFirst().map(error -> error.getField() +  ": " + error.getDefaultMessage()).orElse("Validation failed");

        return  buildResponse(HttpStatus.BAD_REQUEST, message);
    }

    /* Fallback (500)*/
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse> handleGeneric(Exception e) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error");
    }

    /*Common Response Builder */
    private ResponseEntity<ApiResponse> buildResponse(HttpStatus status, String message) {
        ApiResponse response = new ApiResponse(false, message, Instant.now());

        return new ResponseEntity<>(response, status);
    }

}
