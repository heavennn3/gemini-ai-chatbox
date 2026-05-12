<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $apiKey = env('GEMINI_API_KEY');
        $response = Http::post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}",
            [
                'contents' => [
                    [
                        'parts' => [
                            [
                                'text' => $request->message,
                            ],
                        ],
                    ],
                ],
            ]
        );

        if ($response->failed()) {
            $error = $response->json()['error']['message'] ?? 'Unable to get a response.';
            return response()->json(['reply' => "Error: {$error}"]);
        }

        $responseData = $response->json();
        $reply = $responseData['candidates'][0]['content']['parts'][0]['text'] ?? 'No reply';
        return response()->json(['reply' => $reply]);
    }
}