//
// Created by spessasus on 21.05.24.
//

#ifndef EXTERN_C_H
#define EXTERN_C_H

#ifdef __cplusplus
#define EXTERN_C_BEGIN extern "C" {
#define EXTERN_C_END }
#else
#define EXTERN_C_BEGIN
#define EXTERN_C_END
#endif

#endif // EXTERN_C_H
