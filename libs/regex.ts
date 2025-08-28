/**
 * @file regex.ts
 * @description Regular expressions for validation
 * @author [@CyrilPonsan](https://github.com/CyrilPonsan)
 */

export const regexMail =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const regexPassword =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[-!@#\$%\^&\*])(?!.*[<>"'])(?=.{12,})/;

export const regexNumber = /^[0-9]*$/;

export const regexGeneric =
  /^(?!.*[<>])[\p{Script=Latin}\p{M}\p{N}\s,.;:'’‘"@\/\\\-&#+!?():_¡¿–—…\p{S}\u200D\uFE0F]+$/u;

export const regexOptionalGeneric =
  /^(?!.*[<>])[\p{Script=Latin}\p{M}\p{N}\s,.;:'’‘"@\/\\\-&#+!?():_¡¿–—…\p{S}\u200D\uFE0F]*$/u;

export const regexUrl = /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;
