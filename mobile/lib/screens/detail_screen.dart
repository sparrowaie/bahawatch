import 'package:flutter/material.dart';

class DetailScreen extends StatelessWidget {
  final Map post;
  const DetailScreen({super.key, required this.post});

  String freshness(String ts) {
    final m = DateTime.now().difference(DateTime.parse(ts)).inMinutes;
    if (m<1) return 'just now';
    if (m<60) return '${m}m ago';
    if (m<1440) return '${(m/60).floor()}h ago';
    return '${(m/1440).floor()}d ago';
  }

  @override Widget build(BuildContext context) {
    const apiBase = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000');
    return Scaffold(
      appBar: AppBar(title: Text(post['roadName'] ?? 'Report')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        if (post['photoUrl']!=null) ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network('$apiBase${post['photoUrl']}', height: 260, fit: BoxFit.cover, errorBuilder: (_,__,___)=> const SizedBox(height:180, child: Center(child: Icon(Icons.image))))),
        const SizedBox(height: 12),
        Wrap(spacing: 6, children: [
          Chip(label: Text(post['status']??'')),
          Chip(label: Text(post['roadCondition']??'')),
          Chip(label: Text(post['severity']??'')),
          if (post['aiConfidence']!=null) Chip(label: Text('AI ${(post['aiConfidence']*100).round()}%')),
        ]),
        const SizedBox(height: 8),
        Text(freshness(post['timestamp']), style: const TextStyle(color: Colors.grey)),
        Text('📍 ${post['lat']}, ${post['lng']} · ${post['geohash']??''}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
        if (post['caption']!=null) Padding(padding: const EdgeInsets.only(top:8), child: Text(post['caption'], style: const TextStyle(fontSize: 15))),
        if (post['aiReason']!=null) Padding(padding: const EdgeInsets.only(top:8), child: Text('AI: ${post['aiReason']}', style: const TextStyle(fontSize: 12, color: Colors.blueGrey))),
        const SizedBox(height: 12),
        FilledButton(onPressed: ()=> Navigator.pushNamed(context, '/timeline', arguments: post['roadName']), child: const Text('View Road Timeline')),
      ]),
    );
  }
}
