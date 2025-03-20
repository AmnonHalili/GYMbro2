    // Return comment with user details
    res.status(201).json({
      comment: {
        id: comment._id,
        post: postId,
        content: comment.content,
        createdAt: comment.get('createdAt'),
        user: {
          id: user._id,
          username: user.username,
          profilePicture: user.profilePicture || ''
        }
      }
    }); 