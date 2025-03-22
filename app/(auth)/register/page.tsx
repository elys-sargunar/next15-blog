"use client"

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/actions/auth";


export default function Register(){
    const [state, action, isPending ] = useActionState(register, undefined)

    return (
        <div className="container w-1/2">
            <h1 className="title">Register</h1>

            <form action={action} className="space-y-4">
                <div>
                    <label htmlFor="email">Email</label>
                    <input type="text" name="email" defaultValue={state?.email}/>
                    {state?.errors?.email && (
                        <p className="text-red-500">{state.errors.email}</p>
                    )}
                </div>


                <div>
                    <label htmlFor="password">Password</label>
                    <input type="password" name="password" defaultValue={state && 'password' in state ? state.password : ''}/>

                    {state?.errors?.password && (
                        <div className="error">
                            <p>Password must : </p>
                            <ul className="list-disc list-inside ml-4">
                                {state.errors.password.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>


                <div>
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input type="password" name="confirmPassword" />
                    {state?.errors?.confirmPassword && (
                        <p className="text-red-500">{state.errors.confirmPassword}</p>
                    )}
                </div>
                
                <div className="flex items-end gap-4">
                    <button disabled={isPending} type="submit" className="btn-primary">{isPending ? "Loading..." : "Register"}</button>
                    <Link className="text-link" href="/login">or login here</Link>
                </div>
            </form>

        </div>
    );
    
}   
